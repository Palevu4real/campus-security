import { prisma } from '../config/prisma.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  refreshTokenExpiry,
} from '../utils/tokens.js';
import { logActivity, raiseAlert } from './audit.service.js';
import { recordFailedAttempt, clearFailedAttempts } from './security.service.js';
import { logger } from '../config/logger.js';

/**
 * Register a new user.
 */
export async function registerUser({ email, password, fullName, role, department, matricNumber, staffId }) {
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      role: role || 'STUDENT',
      department,
      matricNumber,
      staffId,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      department: true,
      createdAt: true,
    },
  });

  return user;
}

/**
 * Login flow.
 * Returns { user, accessToken, refreshToken, sessionId }
 */
export async function loginUser({ email, password, req }) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Generic error for both "user not found" and "wrong password"
  // (prevents user enumeration)
  const genericError = new Error('Invalid credentials');
  genericError.status = 401;

  if (!user) {
    // Still count the attempt against the email to prevent enumeration timing
    await recordFailedAttempt(email, req);
    throw genericError;
  }

  if (user.isLocked) {
    await logActivity({
      userId: user.id,
      action: 'LOGIN_BLOCKED_LOCKED_ACCOUNT',
      severity: 'WARNING',
      req,
      metadata: { email },
    });
    const err = new Error(
      'Account is locked due to too many failed attempts. Contact the administrator.'
    );
    err.status = 403;
    throw err;
  }

  if (!user.isActive) {
    const err = new Error('Account is deactivated');
    err.status = 403;
    throw err;
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    const result = await recordFailedAttempt(email, req);
    // Attach remaining attempts info for the client
    genericError.attempts = result.attempts;
    genericError.locked = result.locked;
    throw genericError;
  }

  // ✅ Success — clear failed attempts
  await clearFailedAttempts(email);

  // Generate tokens
  const accessToken = generateAccessToken({ sub: user.id, role: user.role });
  const refreshToken = generateRefreshToken({ sub: user.id, role: user.role });

  // Persist session (for refresh token rotation + admin visibility)
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      ipAddress: req?.ip || 'unknown',
      userAgent: req?.headers?.['user-agent'] || null,
      expiresAt: refreshTokenExpiry(),
    },
  });

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      lastLoginIp: req?.ip || null,
      failedAttempts: 0,
    },
  });

  await logActivity({
    userId: user.id,
    action: 'LOGIN_SUCCESS',
    severity: 'INFO',
    req,
    metadata: { email, sessionId: session.id },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
    },
    accessToken,
    refreshToken,
    sessionId: session.id,
  };
}

/**
 * Refresh access token using a valid refresh token.
 * Rotates the refresh token (old one revoked, new one issued).
 */
export async function refreshSession({ refreshToken, req }) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    const e = new Error('Invalid or expired refresh token');
    e.status = 401;
    throw e;
  }

  const session = await prisma.session.findUnique({ where: { refreshToken } });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    const e = new Error('Refresh token revoked or expired');
    e.status = 401;
    throw e;
  }

  // Revoke old refresh token
  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  // Issue new tokens
  const newAccessToken = generateAccessToken({ sub: payload.sub, role: payload.role });
  const newRefreshToken = generateRefreshToken({ sub: payload.sub, role: payload.role });

  await prisma.session.create({
    data: {
      userId: payload.sub,
      refreshToken: newRefreshToken,
      ipAddress: req?.ip || 'unknown',
      userAgent: req?.headers?.['user-agent'] || null,
      expiresAt: refreshTokenExpiry(),
    },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * Logout — revoke the session.
 */
export async function logoutUser({ refreshToken, userId, req }) {
  if (refreshToken) {
    await prisma.session.updateMany({
      where: { refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  await logActivity({
    userId,
    action: 'LOGOUT',
    severity: 'INFO',
    req,
  });

  return { success: true };
}
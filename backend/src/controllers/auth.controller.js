import {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
} from '../services/auth.service.js';
import { logActivity } from '../services/audit.service.js';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

/**
 * POST /api/auth/register
 */
export async function register(req, res, next) {
  try {
    const user = await registerUser(req.body);

    await logActivity({
      userId: user.id,
      action: 'USER_REGISTERED',
      severity: 'INFO',
      req,
      metadata: { email: user.email, role: user.role },
    });

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  try {
    const { user, accessToken, refreshToken } = await loginUser({
      email: req.body.email,
      password: req.body.password,
      req,
    });

    // Refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    res.json({
      user,
      accessToken,
      expiresIn: env.jwt.expiresIn,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 */
export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const { accessToken, refreshToken: newRefreshToken } = await refreshSession({
      refreshToken,
      req,
    });

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);
    res.json({ accessToken, expiresIn: env.jwt.expiresIn });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
export async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken;
    const userId = req.user?.id || null;

    await logoutUser({ refreshToken, userId, req });

    res.clearCookie('refreshToken', { path: '/' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 */
export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        matricNumber: true,
        staffId: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
      },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
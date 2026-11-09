import { redis } from '../config/redis.js';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { logActivity, raiseAlert } from './audit.service.js';

const FAIL_KEY = (email) => `failed_login:${email.toLowerCase()}`;

/**
 * Record a failed login attempt.
 * After MAX_FAILED_ATTEMPTS failures within the lockout window:
 *   1. Lock the user account in DB
 *   2. Log CRITICAL activity
 *   3. Raise an Alert (Socket.io + DB)
 *
 * Returns { attempts, locked }
 */
export async function recordFailedAttempt(email, req) {
  const key = FAIL_KEY(email);
  const attempts = await redis.incr(key);

  // Set expiry on first failure
  if (attempts === 1) {
    await redis.expire(key, env.security.lockoutDurationMinutes * 60);
  }

  // Always log the failed attempt
  await logActivity({
    action: 'LOGIN_FAILED',
    severity: attempts >= env.security.maxFailedAttempts ? 'CRITICAL' : 'WARNING',
    req,
    metadata: { email, attempts },
  });

  let locked = false;

  if (attempts >= env.security.maxFailedAttempts) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (user && !user.isLocked) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isLocked: true,
          lockedAt: new Date(),
          lockedReason: `Auto-locked after ${attempts} failed login attempts`,
          failedAttempts: attempts,
        },
      });

      await logActivity({
        userId: user.id,
        action: 'ACCOUNT_LOCKED',
        severity: 'CRITICAL',
        req,
        metadata: { email, attempts, reason: 'brute_force_protection' },
      });

      await raiseAlert({
        type: 'BRUTE_FORCE',
        severity: 'CRITICAL',
        title: `Account locked: ${email}`,
        message: `${attempts} failed login attempts in ${env.security.lockoutDurationMinutes} minutes. Account auto-locked.`,
        targetUserId: user.id,
        ipAddress: req?.ip || null,
        metadata: { email, attempts },
      });

      locked = true;
      logger.warn(`🔒 Account locked: ${email}`);
    }
  }

  return { attempts, locked };
}

/**
 * Clear failed-attempt counter (called on successful login).
 */
export async function clearFailedAttempts(email) {
  await redis.del(FAIL_KEY(email));
}

/**
 * Get current failed attempt count.
 */
export async function getFailedAttempts(email) {
  const val = await redis.get(FAIL_KEY(email));
  return parseInt(val || '0', 10);
}

/**
 * Admin action: unlock a locked account manually.
 */
export async function unlockAccount(userId, adminId, req) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isLocked: false,
      lockedAt: null,
      lockedReason: null,
      failedAttempts: 0,
    },
  });

  await clearFailedAttempts(user.email);

  await logActivity({
    userId: adminId,
    action: 'ACCOUNT_UNLOCKED',
    severity: 'WARNING',
    req,
    metadata: { unlockedUserId: userId, unlockedEmail: user.email },
  });

  return user;
}
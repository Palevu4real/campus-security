import { prisma } from '../config/prisma.js';
import { unlockAccount } from '../services/security.service.js';
import { logActivity } from '../services/audit.service.js';

/**
 * GET /api/users/locked
 * Admin-only. Returns all locked users.
 */
export async function listLockedUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: { isLocked: true },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        failedAttempts: true,
        lockedAt: true,
        lockedReason: true,
        lastLoginAt: true,
        lastLoginIp: true,
      },
      orderBy: { lockedAt: 'desc' },
    });

    res.json({ users });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/:id/unlock
 * Admin-only. Unlocks a user account and clears the Redis counter.
 */
export async function unlockUser(req, res, next) {
  try {
    const user = await unlockAccount(req.params.id, req.user.id, req);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isLocked: user.isLocked,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users
 * Admin-only. List all users (for the "Total Users" stat).
 */
export async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        isActive: true,
        isLocked: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json({ users });
  } catch (err) {
    next(err);
  }
}


/**
 * PATCH /api/users/:id
 * ADMIN only. Can toggle isActive, change role, fullName, department.
 */
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const allowed = ['fullName', 'role', 'department', 'isActive'];
    const data = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        isActive: true,
        isLocked: true,
      },
    });

    await logActivity({
      userId: req.user.id,
      action: 'USER_UPDATED',
      severity: 'WARNING',
      req,
      metadata: { targetUserId: id, changes: data },
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}
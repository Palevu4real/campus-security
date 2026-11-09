import { verifyAccessToken } from '../utils/tokens.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';

/**
 * Extract Bearer token from Authorization header or accessToken cookie.
 */
function extractToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }
  return null;
}

/**
 * Require a valid access token. Attaches req.user if valid.
 * Returns 401 otherwise.
 */
export async function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        isLocked: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (user.isLocked) {
      return res.status(403).json({ error: 'Account is locked' });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.warn('Auth failed', { error: err.message, path: req.path });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Attach req.user if a valid token is present, but do not block.
 * Useful for endpoints that behave differently when logged in.
 */
export async function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true, isLocked: true },
    });
    if (user && !user.isLocked && user.isActive) {
      req.user = user;
    }
  } catch {
    // Silent — user just stays anonymous
  }
  next();
}

/**
 * Require one of the given roles. Must be used AFTER requireAuth.
 *
 * Usage: requireRole('ADMIN', 'SUPER_ADMIN')
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Forbidden access attempt', {
        userId: req.user.id,
        role: req.user.role,
        allowed: allowedRoles,
        path: req.path,
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
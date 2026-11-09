import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';
import { getIO } from '../sockets/index.js';
import { sendAlertEmail } from './email.service.js';

/**
 * Log a security-relevant action to ActivityLog and notify admins in real-time.
 *
 * @param {Object} params
 * @param {string} [params.userId]        - User UUID (if known)
 * @param {string} params.action          - e.g. LOGIN_SUCCESS, LOGIN_FAILED, ACCOUNT_LOCKED
 * @param {string} [params.severity]      - INFO | WARNING | CRITICAL
 * @param {Object} [params.req]           - Express request (for IP, user-agent, path, method)
 * @param {Object} [params.metadata]      - extra context (JSON)
 */
export async function logActivity({
  userId = null,
  action,
  severity = 'INFO',
  req = null,
  metadata = null,
}) {
  const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || null;
  const userAgent = req?.headers?.['user-agent'] || null;
  const path = req?.originalUrl || null;
  const method = req?.method || null;

  try {
    const log = await prisma.activityLog.create({
      data: {
        userId,
        action,
        severity,
        ipAddress,
        userAgent,
        path,
        method,
        metadata,
      },
    });

    logger.info(`[${severity}] ${action}`, {
      userId,
      ipAddress,
      action,
    });

    return log;
  } catch (err) {
    // Never let logging failures break the request
    logger.error('Failed to write ActivityLog', {
      error: err.message,
      action,
      userId,
    });
    return null;
  }
}

/**
 * Create a security Alert and push it to all admin sockets.
 */
export async function raiseAlert({
  type,
  severity = 'WARNING',
  title,
  message,
  targetUserId = null,
  ipAddress = null,
  metadata = null,
}) {
  try {
    const alert = await prisma.alert.create({
      data: {
        type,
        severity,
        title,
        message,
        targetUserId,
        ipAddress,
        metadata,
      },
    });

    // Emit to admin room
    try {
      const io = getIO();
      io.to('admin:alerts').emit('alert:new', alert);

    // Send email for CRITICAL alerts (best-effort)
    if (severity === 'CRITICAL') {
      sendAlertEmail(alert).catch((err) => {
        logger.error('Email send failed', { error: err.message });
      });
    }
      logger.warn(`🚨 ALERT: ${title}`, { type, severity, targetUserId });
    } catch (socketErr) {
      // Socket may not be initialized yet (e.g. during tests)
      logger.warn('Socket emit failed', { error: socketErr.message });
    }

    return alert;
  } catch (err) {
    logger.error('Failed to create Alert', { error: err.message, type });
    return null;
  }
}
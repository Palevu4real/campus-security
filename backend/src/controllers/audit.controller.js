import { prisma } from '../config/prisma.js';

/**
 * GET /api/audit/logs
 * Admin-only. Query params:
 *   ?action=TAMPER_ATTEMPT   filter by action
 *   ?severity=CRITICAL       filter by severity
 *   ?limit=100               max rows (default 100, cap 500)
 *   ?from=2026-10-01         start date
 *   ?to=2026-10-31           end date
 */
export async function listAuditLogs(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const { action, severity, from, to } = req.query;

    const where = {};
    if (action) where.action = action;
    if (severity) where.severity = severity;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, email: true, fullName: true, role: true },
        },
      },
    });

    res.json({ logs });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/audit/stats
 * Returns counts by action for the last N days.
 */
export async function auditStats(req, res, next) {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const byAction = await prisma.activityLog.groupBy({
      by: ['action'],
      where: { createdAt: { gte: since } },
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
    });

    const bySeverity = await prisma.activityLog.groupBy({
      by: ['severity'],
      where: { createdAt: { gte: since } },
      _count: { severity: true },
    });

    res.json({ byAction, bySeverity, days });
  } catch (err) {
    next(err);
  }
}
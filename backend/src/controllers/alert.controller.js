import { prisma } from '../config/prisma.js';

/**
 * GET /api/alerts
 * Admin-only. Returns most recent alerts, newest first.
 * Query params: ?limit=50&severity=CRITICAL&resolved=false
 */
export async function listAlerts(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const { severity, resolved, type } = req.query;

    const where = {};
    if (severity) where.severity = severity;
    if (resolved === 'true') where.isResolved = true;
    if (resolved === 'false') where.isResolved = false;
    if (type) where.type = type;

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        targetUser: {
          select: { id: true, email: true, fullName: true, role: true },
        },
      },
    });

    res.json({ alerts });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/alerts/:id/resolve
 * Admin marks an alert as resolved.
 */
export async function resolveAlert(req, res, next) {
  try {
    const alert = await prisma.alert.update({
      where: { id: req.params.id },
      data: {
        isResolved: true,
        resolvedBy: req.user.id,
        resolvedAt: new Date(),
      },
    });

    res.json({ alert });
  } catch (err) {
    next(err);
  }
}
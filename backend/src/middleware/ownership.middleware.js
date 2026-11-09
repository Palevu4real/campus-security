import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';

/**
 * Ensure the logged-in student can only access THEIR OWN result.
 * Admins and lecturers bypass this check.
 */
export async function requireResultOwnership(req, res, next) {
  try {
    const { id } = req.params;
    const result = await prisma.result.findUnique({ where: { id } });

    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      req.result = result;
      return next();
    }

    if (req.user.role === 'LECTURER') {
      // Lecturer can access if they uploaded it
      if (result.uploadedBy === req.user.id) {
        req.result = result;
        return next();
      }
      logger.warn('Lecturer tried to access result they did not upload', {
        userId: req.user.id,
        resultId: id,
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (req.user.role === 'STUDENT') {
      if (result.studentId === req.user.id) {
        req.result = result;
        return next();
      }
      logger.warn('Student tried to access another student\'s result', {
        userId: req.user.id,
        resultId: id,
      });
      return res.status(403).json({ error: 'You can only view your own results' });
    }

    return res.status(403).json({ error: 'Insufficient permissions' });
  } catch (err) {
    next(err);
  }
}
import { Router } from 'express';
import { listAuditLogs, auditStats } from '../controllers/audit.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole('ADMIN', 'SUPER_ADMIN'));

router.get('/logs', listAuditLogs);
router.get('/stats', auditStats);

export default router;
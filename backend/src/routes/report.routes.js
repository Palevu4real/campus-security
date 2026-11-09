import { Router } from 'express';
import { downloadIncidentReport } from '../controllers/report.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole('ADMIN', 'SUPER_ADMIN'));

router.get('/incident.pdf', downloadIncidentReport);

export default router;
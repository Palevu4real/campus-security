import { Router } from 'express';
import { listAlerts, resolveAlert } from '../controllers/alert.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole('ADMIN', 'SUPER_ADMIN'));

router.get('/', listAlerts);
router.patch('/:id/resolve', resolveAlert);

export default router;
import { Router } from 'express';
import {
  listLockedUsers,
  unlockUser,
  listUsers,
  updateUser,
} from '../controllers/user.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole('ADMIN', 'SUPER_ADMIN'));

router.get('/', listUsers);
router.get('/locked', listLockedUsers);
router.post('/:id/unlock', unlockUser);
router.patch('/:id', updateUser);

export default router;
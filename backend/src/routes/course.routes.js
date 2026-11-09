import { Router } from 'express';
import { create, list, getOne, update } from '../controllers/course.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { z } from 'zod';

const router = Router();

router.use(requireAuth);

const createSchema = z.object({
  code: z.string().min(2).max(20).toUpperCase(),
  title: z.string().min(2).max(200),
  department: z.string().min(2).max(100),
  creditUnits: z.number().int().min(1).max(10),
  lecturerId: z.string().uuid().optional().nullable(),
});

const updateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  department: z.string().min(2).max(100).optional(),
  creditUnits: z.number().int().min(1).max(10).optional(),
  lecturerId: z.string().uuid().nullable().optional(),
}).strict();

router.get('/', list);
router.get('/:id', getOne);

router.post(
  '/',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validate(createSchema),
  create
);

router.patch(
  '/:id',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validate(updateSchema),
  update
);

export default router;
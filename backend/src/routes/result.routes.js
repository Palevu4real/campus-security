import { Router } from 'express';
import {
  upload,
  edit,
  unlock,
  verify,
  list,
  getOne,
  courseStudents,
  bulkUpload,
} from '../controllers/result.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { requireResultOwnership } from '../middleware/ownership.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { z } from 'zod';

const router = Router();

router.use(requireAuth);

const uploadSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  courseId: z.string().uuid('Invalid course ID'),
  score: z.number().int().min(0).max(100),
  session: z.string().regex(/^\d{4}\/\d{4}$/, 'Session must be like 2024/2025'),
  semester: z.enum(['FIRST', 'SECOND']),
});

const editSchema = z.object({
  score: z.number().int().min(0).max(100).optional(),
}).strict();

const bulkSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  session: z.string().regex(/^\d{4}\/\d{4}$/, 'Session must be like 2024/2025'),
  semester: z.enum(['FIRST', 'SECOND']),
  rows: z.array(
    z.object({
      studentId: z.string().uuid('Invalid student ID'),
      score: z.number().int().min(0).max(100),
    })
  ).min(1).max(500),
});

router.get('/', list);

router.post(
  '/',
  requireRole('LECTURER', 'ADMIN', 'SUPER_ADMIN'),
  validate(uploadSchema),
  upload
);

// IMPORTANT: must come before /:id routes
router.post(
  '/bulk',
  requireRole('LECTURER', 'ADMIN', 'SUPER_ADMIN'),
  validate(bulkSchema),
  bulkUpload
);

router.get(
  '/course/:courseId/students',
  requireRole('LECTURER', 'ADMIN', 'SUPER_ADMIN'),
  courseStudents
);

router.patch(
  '/:id',
  requireRole('LECTURER', 'ADMIN', 'SUPER_ADMIN'),
  validate(editSchema),
  edit
);

router.post('/:id/unlock', requireRole('ADMIN', 'SUPER_ADMIN'), unlock);

router.get('/:id/verify', requireRole('ADMIN', 'SUPER_ADMIN'), verify);

router.get('/:id', requireResultOwnership, getOne);

export default router;
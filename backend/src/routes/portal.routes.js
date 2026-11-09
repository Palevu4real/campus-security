import { Router } from 'express';
import {
  myResults,
  mySummary,
  myProfile,
} from '../controllers/student.controller.js';
import {
  myUploads,
  myCourses,
  listStudentsForUpload,
} from '../controllers/lecturer.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

// ---------- Student-only ----------
router.get(
  '/students/me/results',
  requireRole('STUDENT'),
  myResults
);
router.get(
  '/students/me/summary',
  requireRole('STUDENT'),
  mySummary
);
router.get(
  '/students/me/profile',
  requireRole('STUDENT'),
  myProfile
);

// ---------- Lecturer-only ----------
router.get(
  '/lecturers/me/uploads',
  requireRole('LECTURER'),
  myUploads
);
router.get(
  '/lecturers/me/courses',
  requireRole('LECTURER'),
  myCourses
);
router.get(
  '/lecturers/me/students',
  requireRole('LECTURER'),
  listStudentsForUpload
);

export default router;

import { prisma } from '../config/prisma.js';
import { logActivity } from './audit.service.js';

/**
 * Create a new course. Admin-only (enforced by route middleware).
 */
export async function createCourse({ code, title, department, creditUnits, lecturerId }, adminId, req) {
  // Check for duplicate code
  const existing = await prisma.course.findUnique({ where: { code } });
  if (existing) {
    const err = new Error('Course code already exists');
    err.status = 409;
    throw err;
  }

  const course = await prisma.course.create({
    data: {
      code,
      title,
      department,
      creditUnits,
      lecturerId: lecturerId || null,
    },
  });

  await logActivity({
    userId: adminId,
    action: 'COURSE_CREATED',
    severity: 'INFO',
    req,
    metadata: { courseId: course.id, code: course.code },
  });

  return course;
}

/**
 * List all courses.
 */
export async function listCourses() {
  return prisma.course.findMany({
    orderBy: { code: 'asc' },
    include: {
      _count: { select: { results: true } },
    },
  });
}

/**
 * Get a single course by ID with its lecturer info.
 */
export async function getCourseById(id) {
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      _count: { select: { results: true } },
    },
  });

  if (!course) {
    const err = new Error('Course not found');
    err.status = 404;
    throw err;
  }

  return course;
}


/**
 * Update a course (admin only). Can change lecturer, title, creditUnits, etc.
 */
export async function updateCourse(courseId, updates, adminId, req) {
  const existing = await prisma.course.findUnique({ where: { id: courseId } });
  if (!existing) {
    const err = new Error('Course not found');
    err.status = 404;
    throw err;
  }

  const allowed = ['title', 'department', 'creditUnits', 'lecturerId'];
  const data = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) data[key] = updates[key];
  }

  const updated = await prisma.course.update({
    where: { id: courseId },
    data,
  });

  await logActivity({
    userId: adminId,
    action: 'COURSE_UPDATED',
    severity: 'INFO',
    req,
    metadata: { courseId, changes: data },
  });

  return updated;
}
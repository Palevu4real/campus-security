import { prisma } from '../config/prisma.js';

/**
 * GET /api/lecturers/me/uploads
 * All results the logged-in lecturer has uploaded.
 */
export async function myUploads(req, res, next) {
  try {
    const results = await prisma.result.findMany({
      where: { uploadedBy: req.user.id },
      include: {
        course: {
          select: { id: true, code: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch the student names for these results
    const studentIds = [...new Set(results.map((r) => r.studentId))];
    const students = await prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, email: true, fullName: true, matricNumber: true },
    });
    const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));

    const enriched = results.map((r) => ({
      ...r,
      student: studentMap[r.studentId] || null,
    }));

    res.json({ results: enriched });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/lecturers/me/courses
 * All courses the lecturer is assigned to.
 */
export async function myCourses(req, res, next) {
  try {
    const courses = await prisma.course.findMany({
      where: { lecturerId: req.user.id },
      include: {
        _count: { select: { results: true } },
      },
      orderBy: { code: 'asc' },
    });

    res.json({ courses });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/lecturers/me/students
 * All students in the database (so lecturer can pick one for upload).
 * Optional filter: ?courseId=<uuid> to list only students NOT yet graded
 */
export async function listStudentsForUpload(req, res, next) {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', isActive: true },
      select: {
        id: true,
        email: true,
        fullName: true,
        matricNumber: true,
        department: true,
      },
      orderBy: { fullName: 'asc' },
    });

    res.json({ students });
  } catch (err) {
    next(err);
  }
}
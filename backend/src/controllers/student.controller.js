import { prisma } from '../config/prisma.js';

/**
 * GET /api/students/me/results
 * Student sees ONLY their own results.
 * Optional query: ?session=2024/2025&semester=FIRST
 */
export async function myResults(req, res, next) {
  try {
    const { session, semester } = req.query;
    const where = { studentId: req.user.id };
    if (session) where.session = session;
    if (semester) where.semester = semester;

    const results = await prisma.result.findMany({
      where,
      include: {
        course: {
          select: { id: true, code: true, title: true, creditUnits: true },
        },
      },
      orderBy: [{ session: 'desc' }, { semester: 'desc' }],
    });

    res.json({ results });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/students/me/summary
 * GPA + counts for the logged-in student.
 * Uses the Nigerian 5-point scale.
 */
export async function mySummary(req, res, next) {
  try {
    const results = await prisma.result.findMany({
      where: { studentId: req.user.id },
      include: {
        course: { select: { creditUnits: true } },
      },
    });

    const GRADE_POINTS = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };

    let totalUnits = 0;
    let totalPoints = 0;

    for (const r of results) {
      const units = r.course.creditUnits;
      const points = GRADE_POINTS[r.grade] ?? 0;
      totalUnits += units;
      totalPoints += points * units;
    }

    const gpa = totalUnits > 0 ? (totalPoints / totalUnits).toFixed(2) : '0.00';

    res.json({
      summary: {
        totalCourses: results.length,
        totalUnits,
        totalPoints,
        gpa,
        gradeCounts: results.reduce((acc, r) => {
          acc[r.grade] = (acc[r.grade] || 0) + 1;
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/students/me/profile
 * Returns the logged-in student's profile.
 */
export async function myProfile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        matricNumber: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
      },
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}
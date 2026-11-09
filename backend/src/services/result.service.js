import { prisma } from '../config/prisma.js';
import { calculateGrade } from '../utils/grading.js';
import { hashResult, verifyResultIntegrity } from '../utils/integrity.js';
import { logActivity, raiseAlert } from './audit.service.js';
import { logger } from '../config/logger.js';
import crypto from 'crypto';

/**
 * Upload a result. On success the result is IMMEDIATELY LOCKED
 * and an integrity hash is stored.
 *
 * If a result for (studentId, courseId, session, semester) already exists,
 * the operation FAILS — even if the uploader is the same lecturer.
 * To change a locked result, the admin must explicitly unlock it first.
 */
export async function uploadResult(
  { studentId, courseId, score, session, semester },
  uploader,
  req
) {
  // 1. Validate student exists
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== 'STUDENT') {
    const err = new Error('Student not found');
    err.status = 404;
    throw err;
  }

  // 2. Validate course exists
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    const err = new Error('Course not found');
    err.status = 404;
    throw err;
  }

  // 3. If uploader is LECTURER, ensure they are teaching this course
  if (uploader.role === 'LECTURER' && course.lecturerId !== uploader.id) {
    await logActivity({
      userId: uploader.id,
      action: 'UNAUTHORIZED_RESULT_UPLOAD_ATTEMPT',
      severity: 'WARNING',
      req,
      metadata: { courseId, reason: 'not_course_lecturer' },
    });
    const err = new Error('You can only upload results for your own courses');
    err.status = 403;
    throw err;
  }

  // 4. Check for duplicate — a result already exists for this combo
  const existing = await prisma.result.findUnique({
    where: {
      studentId_courseId_session_semester: {
        studentId,
        courseId,
        session,
        semester,
      },
    },
  });

  if (existing) {
    // 🚨 This is the TAMPER / DUPLICATE attempt
    await logActivity({
      userId: uploader.id,
      action: 'DUPLICATE_RESULT_UPLOAD_ATTEMPT',
      severity: 'CRITICAL',
      req,
      metadata: {
        existingResultId: existing.id,
        studentId,
        courseId,
        session,
        semester,
      },
    });

    await raiseAlert({
      type: 'TAMPER_ATTEMPT',
      severity: 'CRITICAL',
      title: `Tamper attempt: re-upload of existing result`,
      message: `${uploader.email} tried to upload a result for student ${student.email} (course ${course.code}, ${session} ${semester}) which already exists. The result is locked.`,
      targetUserId: uploader.id,
      ipAddress: req?.ip || null,
      metadata: { existingResultId: existing.id, courseId, studentId },
    });

    logger.warn(`🚨 Duplicate upload blocked`, {
      uploader: uploader.email,
      student: student.email,
      course: course.code,
    });

    const err = new Error(
      'A result for this student/course/session/semester already exists and is locked. Contact the administrator to unlock.'
    );
    err.status = 403;
    throw err;
  }

  // 5. Calculate grade
  const { grade, points } = calculateGrade(score);

  // 6. Create result with a temporary ID (we need the ID for the hash)
  const tempId = crypto.randomUUID();

  const integrityHash = hashResult({
    id: tempId,
    studentId,
    courseId,
    score,
    grade,
    session,
    semester,
    uploadedBy: uploader.id,
  });

  // 7. Persist with lock + hash
  const result = await prisma.result.create({
    data: {
      id: tempId,
      studentId,
      courseId,
      score,
      grade,
      session,
      semester,
      uploadedBy: uploader.id,
      isLocked: true,
      lockedAt: new Date(),
      integrityHash,
    },
    include: {
      course: { select: { code: true, title: true } },
    },
  });

  await logActivity({
    userId: uploader.id,
    action: 'RESULT_UPLOADED_AND_LOCKED',
    severity: 'INFO',
    req,
    metadata: {
      resultId: result.id,
      studentId,
      courseId,
      score,
      grade,
      points,
    },
  });

  return { ...result, points };
}

/**
 * Attempt to edit a locked result. This ALWAYS FAILS and raises an alert.
 * Admins must unlock first via unlockResult().
 */
export async function attemptEditResult(resultId, updates, user, req) {
  const result = await prisma.result.findUnique({ where: { id: resultId } });

  if (!result) {
    const err = new Error('Result not found');
    err.status = 404;
    throw err;
  }

  if (result.isLocked) {
    // 🚨 TAMPER ATTEMPT
    await logActivity({
      userId: user.id,
      action: 'TAMPER_ATTEMPT',
      severity: 'CRITICAL',
      req,
      metadata: {
        resultId,
        attemptedChanges: updates,
        reason: 'result_is_locked',
      },
    });

    await raiseAlert({
      type: 'TAMPER_ATTEMPT',
      severity: 'CRITICAL',
      title: `Tamper attempt on locked result`,
      message: `${user.email} (${user.role}) tried to modify a locked result ${resultId}. Attempted changes: ${JSON.stringify(updates)}`,
      targetUserId: user.id,
      ipAddress: req?.ip || null,
      metadata: { resultId, attemptedChanges: updates },
    });

    logger.warn(`🚨 Tamper attempt blocked`, {
      userId: user.id,
      email: user.email,
      resultId,
      updates,
    });

    const err = new Error(
      'Result is locked and cannot be modified. Contact the administrator.'
    );
    err.status = 403;
    throw err;
  }

  // Only admins should reach here (after unlock)
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    const err = new Error('Only administrators can modify unlocked results');
    err.status = 403;
    throw err;
  }

  // Recalculate grade if score changed
  let grade = result.grade;
  if (updates.score !== undefined) {
    grade = calculateGrade(updates.score).grade;
  }

  // Recompute hash
  const newHash = hashResult({
    id: result.id,
    studentId: result.studentId,
    courseId: result.courseId,
    score: updates.score ?? result.score,
    grade,
    session: result.session,
    semester: result.semester,
    uploadedBy: result.uploadedBy,
  });

  const updated = await prisma.result.update({
    where: { id: resultId },
    data: {
      ...updates,
      grade,
      integrityHash: newHash,
    },
  });

  await logActivity({
    userId: user.id,
    action: 'RESULT_MODIFIED',
    severity: 'WARNING',
    req,
    metadata: { resultId, changes: updates },
  });

  return updated;
}

/**
 * Admin-only: unlock a result so it can be edited.
 */
export async function unlockResult(resultId, adminId, req) {
  const result = await prisma.result.findUnique({ where: { id: resultId } });
  if (!result) {
    const err = new Error('Result not found');
    err.status = 404;
    throw err;
  }

  if (!result.isLocked) {
    const err = new Error('Result is already unlocked');
    err.status = 400;
    throw err;
  }

  const updated = await prisma.result.update({
    where: { id: resultId },
    data: { isLocked: false, lockedAt: null },
  });

  await logActivity({
    userId: adminId,
    action: 'RESULT_UNLOCKED',
    severity: 'WARNING',
    req,
    metadata: { resultId, studentId: result.studentId },
  });

  return updated;
}

/**
 * Verify integrity of a result.
 */
export async function verifyResult(resultId, user, req) {
  const result = await prisma.result.findUnique({ where: { id: resultId } });
  if (!result) {
    const err = new Error('Result not found');
    err.status = 404;
    throw err;
  }

  const check = verifyResultIntegrity(result);

  if (!check.valid) {
    await logActivity({
      userId: user.id,
      action: 'INTEGRITY_VIOLATION_DETECTED',
      severity: 'CRITICAL',
      req,
      metadata: { resultId, expected: check.expected, stored: check.stored },
    });

    await raiseAlert({
      type: 'DATA_INTEGRITY_VIOLATION',
      severity: 'CRITICAL',
      title: `Integrity violation on result ${resultId}`,
      message: `Stored hash does not match recomputed hash. Possible direct DB tampering.`,
      ipAddress: req?.ip || null,
      metadata: { resultId, expected: check.expected, stored: check.stored },
    });
  }

  return check;
}

/**
 * List results for a student (own results) or lecturer (their uploads).
 */
export async function listResultsForUser(user) {
  if (user.role === 'STUDENT') {
    return prisma.result.findMany({
      where: { studentId: user.id },
      include: { course: { select: { code: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (user.role === 'LECTURER') {
    return prisma.result.findMany({
      where: { uploadedBy: user.id },
      include: {
        course: { select: { code: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admins see everything
  return prisma.result.findMany({
    include: {
      course: { select: { code: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
}


/**
 * List students enrolled/should-be-graded for a course.
 */
export async function listStudentsForCourse(courseId) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    const err = new Error('Course not found');
    err.status = 404;
    throw err;
  }

  const students = await prisma.user.findMany({
    where: { role: 'STUDENT', isActive: true },
    select: {
      id: true,
      fullName: true,
      email: true,
      matricNumber: true,
      department: true,
    },
    orderBy: { fullName: 'asc' },
  });

  return { course, students };
}

/**
 * Bulk upload results. Processes each row independently.
 */
export async function bulkUploadResults(
  { courseId, session, semester, rows },
  uploader,
  req
) {
  if (!Array.isArray(rows) || rows.length === 0) {
    const err = new Error('No rows provided');
    err.status = 400;
    throw err;
  }

  if (rows.length > 500) {
    const err = new Error('Maximum 500 rows per bulk upload');
    err.status = 400;
    throw err;
  }

  const successful = [];
  const failed = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      if (!row.studentId || row.score === undefined || row.score === null) {
        throw new Error('Missing studentId or score');
      }

      const result = await uploadResult(
        {
          studentId: row.studentId,
          courseId,
          score: parseInt(row.score, 10),
          session,
          semester,
        },
        uploader,
        req
      );

      successful.push({
        row: rowNum,
        studentId: row.studentId,
        resultId: result.id,
        grade: result.grade,
        score: result.score,
      });
    } catch (err) {
      failed.push({
        row: rowNum,
        studentId: row.studentId,
        score: row.score,
        error: err.message,
      });
    }
  }

  await logActivity({
    userId: uploader.id,
    action: 'BULK_RESULT_UPLOAD',
    severity: failed.length > 0 ? 'WARNING' : 'INFO',
    req,
    metadata: {
      courseId,
      session,
      semester,
      total: rows.length,
      succeeded: successful.length,
      failed: failed.length,
    },
  });

  return {
    total: rows.length,
    succeeded: successful.length,
    failed: failed.length,
    successful,
    failures: failed,
  };
}


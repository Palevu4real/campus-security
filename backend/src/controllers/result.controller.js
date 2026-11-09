import {
  uploadResult,
  attemptEditResult,
  unlockResult,
  verifyResult,
  listResultsForUser,
  listStudentsForCourse,
  bulkUploadResults,
} from '../services/result.service.js';
import { logActivity } from '../services/audit.service.js';

/**
 * POST /api/results
 * Roles: LECTURER, ADMIN
 */
export async function upload(req, res, next) {
  try {
    const { studentId, courseId, score, session, semester } = req.body;

    const result = await uploadResult(
      { studentId, courseId, score, session, semester },
      req.user,
      req
    );

    res.status(201).json({ result });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/results/:id
 * Attempt to edit — will be blocked if locked (which is always after upload).
 * Roles: LECTURER, ADMIN
 */
export async function edit(req, res, next) {
  try {
    const result = await attemptEditResult(req.params.id, req.body, req.user, req);
    res.json({ result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/results/:id/unlock
 * Roles: ADMIN only
 */
export async function unlock(req, res, next) {
  try {
    const result = await unlockResult(req.params.id, req.user.id, req);
    res.json({ result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/results/:id/verify
 * Roles: ADMIN only
 */
export async function verify(req, res, next) {
  try {
    const check = await verifyResult(req.params.id, req.user, req);
    res.json(check);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/results
 * Students see their own; lecturers see their uploads; admins see all.
 */
export async function list(req, res, next) {
  try {
    const results = await listResultsForUser(req.user);
    res.json({ results });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/results/:id
 * Ownership enforced by requireResultOwnership middleware
 */
export async function getOne(req, res, next) {
  try {
    // req.result was attached by requireResultOwnership
    res.json({ result: req.result });
  } catch (err) {
    next(err);
  }
}



/**
 * GET /api/results/course/:courseId/students
 */
export async function courseStudents(req, res, next) {
  try {
    const data = await listStudentsForCourse(req.params.courseId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/results/bulk
 */
export async function bulkUpload(req, res, next) {
  try {
    const { courseId, session, semester, rows } = req.body;

    if (!courseId || !session || !semester) {
      return res.status(400).json({
        error: 'courseId, session, and semester are required',
      });
    }

    const report = await bulkUploadResults(
      { courseId, session, semester, rows },
      req.user,
      req
    );

    res.status(200).json(report);
  } catch (err) {
    next(err);
  }
}
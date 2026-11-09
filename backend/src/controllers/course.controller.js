import {
  createCourse,
  listCourses,
  getCourseById,
  updateCourse,
} from '../services/course.service.js';

/**
 * POST /api/courses
 * Roles: ADMIN only
 */
export async function create(req, res, next) {
  try {
    const course = await createCourse(req.body, req.user.id, req);
    res.status(201).json({ course });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/courses
 * Roles: any authenticated user
 */
export async function list(req, res, next) {
  try {
    const courses = await listCourses();
    res.json({ courses });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/courses/:id
 * Roles: any authenticated user
 */
export async function getOne(req, res, next) {
  try {
    const course = await getCourseById(req.params.id);
    res.json({ course });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/courses/:id
 * ADMIN only
 */
export async function update(req, res, next) {
  try {
    const course = await updateCourse(req.params.id, req.body, req.user.id, req);
    res.json({ course });
  } catch (err) {
    next(err);
  }
}
/**
 * Nigerian 5-point grading scale (NUC standard).
 * A: 70-100 (5.0)
 * B: 60-69  (4.0)
 * C: 50-59  (3.0)
 * D: 45-49  (2.0)
 * E: 40-44  (1.0)
 * F: 0-39   (0.0)
 */
export function calculateGrade(score) {
  if (score < 0 || score > 100 || !Number.isInteger(score)) {
    const err = new Error('Score must be an integer between 0 and 100');
    err.status = 400;
    throw err;
  }
  if (score >= 70) return { grade: 'A', points: 5.0 };
  if (score >= 60) return { grade: 'B', points: 4.0 };
  if (score >= 50) return { grade: 'C', points: 3.0 };
  if (score >= 45) return { grade: 'D', points: 2.0 };
  if (score >= 40) return { grade: 'E', points: 1.0 };
  return { grade: 'F', points: 0.0 };
}
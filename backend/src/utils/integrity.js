import crypto from 'crypto';

/**
 * Compute a deterministic SHA-256 hash of a result record.
 * Any change to any field produces a different hash → tamper detected.
 */
export function hashResult({ id, studentId, courseId, score, grade, session, semester, uploadedBy }) {
  const payload = [
    id,
    studentId,
    courseId,
    score,
    grade,
    session,
    semester,
    uploadedBy,
  ].join('|');

  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Verify that a stored result still matches its integrity hash.
 */
export function verifyResultIntegrity(result) {
  const expected = hashResult(result);
  return {
    valid: expected === result.integrityHash,
    expected,
    stored: result.integrityHash,
  };
}
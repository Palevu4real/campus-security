import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, env.security.bcryptRounds);
}

export async function verifyPassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

// Returns strength score 0-4 and reasons why weak
export function checkPasswordStrength(password) {
  let score = 0;
  const issues = [];

  if (password.length >= 8) score++;
  else issues.push('Must be at least 8 characters');

  if (/[A-Z]/.test(password)) score++;
  else issues.push('Must contain an uppercase letter');

  if (/[a-z]/.test(password)) score++;
  else issues.push('Must contain a lowercase letter');

  if (/\d/.test(password)) score++;
  else issues.push('Must contain a number');

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  else issues.push('Must contain a special character');

  return { score, issues, isStrong: score >= 4 };
}
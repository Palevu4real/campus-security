import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  fullName: z.string().min(2, 'Full name required').max(100),
  role: z.enum(['STUDENT', 'LECTURER', 'STAFF', 'ADMIN']).optional(),
  department: z.string().max(100).optional(),
  matricNumber: z.string().max(50).optional(),
  staffId: z.string().max(50).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

export function formatZodError(error) {
  return error.issues.map((e) => ({
    field: e.path.join('.'),
    message: e.message,
  }));
}
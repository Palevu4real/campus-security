import { formatZodError } from '../utils/validators.js';

/**
 * Validate req.body against a Zod schema.
 *
 * Usage: router.post('/x', validate(registerSchema), controller)
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatZodError(result.error),
      });
    }
    req.body = result.data;
    next();
  };
}
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// Limits login/register attempts per IP to slow down password guessing.
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

import { z } from 'zod';
import { BHAWANS, IITR_EMAIL_DOMAIN } from './config';

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .pipe(z.email('Enter a valid email address'))
  .refine((value) => value.endsWith(IITR_EMAIL_DOMAIN), {
    message: `Please use your IITR email (ending in ${IITR_EMAIL_DOMAIN})`,
  });

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  email,
  enrollmentNo: z
    .string()
    .trim()
    .regex(/^[0-9]{5,12}$/, 'Enrollment number should be 5–12 digits'),
  bhawan: z.enum(BHAWANS, { message: 'Please select your bhawan' }),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9][0-9]{9}$/, 'Enter a valid 10-digit mobile number'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const addToCartSchema = z.object({
  itemId: z.string().min(1, 'itemId is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50).default(1),
});

export const updateCartSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50),
});

export const placeOrderSchema = z.object({
  bhawan: z.enum(BHAWANS, { message: 'Please select a bhawan' }),
  roomNo: z.string().trim().min(1, 'Room number is required').max(20),
  note: z.string().trim().max(300, 'Note must be under 300 characters').optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartInput = z.infer<typeof updateCartSchema>;
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

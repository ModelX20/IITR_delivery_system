import { z } from 'zod';
import { BHAWANS, CATEGORIES, ORDER_STATUSES, PARTNER_STATUSES, ROLES, SIGNUP_ROLES } from './config';

/** Any address is accepted: sign-up proves ownership with an emailed code. */
const email = z.string().trim().toLowerCase().min(1, 'Email is required').pipe(z.email('Enter a valid email address'));

const password = z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password must be at most 72 characters');

const profileFields = {
  enrollmentNo: z
    .string()
    .trim()
    .regex(/^[0-9]{5,12}$/, 'Enrollment number should be 5–12 digits'),
  bhawan: z.enum(BHAWANS, { message: 'Please select your bhawan' }),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9][0-9]{9}$/, 'Enter a valid 10-digit mobile number'),
};

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  email,
  ...profileFields,
  password,
  role: z.enum(SIGNUP_ROLES, { message: 'Choose whether you want to order or deliver' }).default('STUDENT'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const completeProfileSchema = z.object(profileFields);

const signupCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code from the email');

export const verifySignupSchema = z.object({ email, code: signupCode });
export const resendSignupCodeSchema = z.object({ email });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20, 'This reset link is invalid').max(200, 'This reset link is invalid'),
  password,
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

// ---------- Admin ----------

const price = z
  .string({ message: 'Price is required' })
  .trim()
  .regex(/^\d{1,8}(\.\d{1,2})?$/, 'Price must be a number with up to 2 decimals, e.g. 45 or 45.50')
  .refine((v) => Number(v) > 0, 'Price must be greater than 0');

const itemFields = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().trim().max(500, 'Description must be under 500 characters'),
  category: z.enum(CATEGORIES, { message: 'Please select a category' }),
  price,
  // Empty = show the built-in illustrated tile instead of a photo.
  imageUrl: z
    .string()
    .trim()
    .refine((v) => v === '' || z.url({ protocol: /^https?$/ }).safeParse(v).success, 'Enter a valid http(s) image URL, or leave it empty'),
  stock: z.number({ message: 'Stock must be a number' }).int('Stock must be a whole number').min(0, 'Stock cannot be negative').max(100000),
};

export const createItemSchema = z.object({ ...itemFields, imageUrl: itemFields.imageUrl.default(''), isActive: z.boolean().default(true) });

// No defaults here: a PATCH must only change the fields it sends.
export const updateItemSchema = z
  .object({ ...itemFields, isActive: z.boolean() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must be YYYY-MM-DD');
const page = z.coerce.number().int().min(1).default(1);
const optionalText = z.string().trim().max(100).optional();

export const adminItemsQuerySchema = z.object({
  search: optionalText,
  category: optionalText,
  status: z.enum(['all', 'active', 'inactive']).default('all'),
  lowStock: z.enum(['true', 'false']).optional(),
});

export const adminOrdersQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  bhawan: optionalText,
  user: optionalText,
  page,
});

export const adminUsersQuerySchema = z.object({
  search: optionalText,
  role: z.enum(ROLES).optional(),
  blocked: z.enum(['true', 'false']).optional(),
  partnerStatus: z.enum(PARTNER_STATUSES).optional(),
  page,
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, { message: 'Invalid status' }),
});

export const updateUserRoleSchema = z.object({ role: z.enum(ROLES, { message: 'Invalid role' }) });
export const updateUserBlockSchema = z.object({ isBlocked: z.boolean() });
export const updatePartnerStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], { message: 'Status must be APPROVED or REJECTED' }),
});

export const updateSettingsSchema = z.object({
  lowStockThreshold: z.number().int('Must be a whole number').min(0).max(10000),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterFormInput = z.input<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
export type VerifySignupInput = z.infer<typeof verifySignupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartInput = z.infer<typeof updateCartSchema>;
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type CreateItemFormInput = z.input<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type AdminOrdersQuery = z.input<typeof adminOrdersQuerySchema>;
export type AdminUsersQuery = z.input<typeof adminUsersQuerySchema>;

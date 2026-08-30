import { z } from 'zod';

// Sanitization helper
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // remove HTML tag markers
    .trim();
}

export function normalizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  return email.toLowerCase().trim();
}

export function formatZodError(err: z.ZodError): string {
  if (err.issues && err.issues.length > 0) {
    return err.issues[0].message;
  }
  return 'Validation error';
}

// 1. Client Registration DTO
export const RegisterClientSchema = z.object({
  name: z.string({ message: 'Name is required' }).trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  email: z.string({ message: 'Email is required' }).trim().email('Invalid email address').max(255, 'Email is too long'),
  password: z
    .string({ message: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().optional(),
  phone: z.string().max(30).optional(),
  clientType: z.enum(['customer', 'business', 'freelancer', 'advertiser', 'service_provider']).optional(),
  termsAccepted: z.boolean().optional(),
  // Even if a malicious client sends role: 'SUPER_ADMIN' or isAdmin: true, backend strictly ignores or enforces 'CLIENT'
  role: z.string().optional(),
  isAdmin: z.boolean().optional(),
  isSuperAdmin: z.boolean().optional()
}).refine(data => !data.confirmPassword || data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

// 2. Login DTO
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required'),
  twoFactorCode: z.string().optional(),
  recoveryCode: z.string().optional()
});

// 3. Verify Email DTO
export const VerifyEmailSchema = z.object({
  token: z.string().min(8, 'Verification token is invalid or missing')
});

// 4. Resend Verification DTO
export const ResendVerificationSchema = z.object({
  email: z.string().email('Invalid email address')
});

// 5. Forgot Password DTO
export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

// 6. Reset Password DTO
export const ResetPasswordSchema = z.object({
  token: z.string().min(8, 'Reset token is invalid or missing'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().optional()
}).refine(data => !data.confirmPassword || data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

// 7. Change Password DTO (Authenticated)
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128)
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().optional()
}).refine(data => !data.confirmPassword || data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

// 8. Admin Password Setup DTO
export const AdminPasswordSetupSchema = z.object({
  token: z.string().min(8, 'Setup token is invalid or missing'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().optional()
}).refine(data => !data.confirmPassword || data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

// 9. Enable 2FA DTO
export const EnableTwoFactorSchema = z.object({
  totpCode: z.string().length(6, 'TOTP code must be 6 digits').regex(/^[0-9]+$/, 'Code must be numeric')
});

// 10. Profile Update DTO
export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(30).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().or(z.string().length(0)).optional(),
  location: z.object({
    city: z.string(),
    state: z.string(),
    country: z.string(),
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
    serviceAreaKm: z.number().optional()
  }).optional()
});

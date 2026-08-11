import { z } from "zod";

const passwordPolicy = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: passwordPolicy,
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  companyName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name cannot be empty").optional(),
  lastName: z.string().min(1, "Last name cannot be empty").optional(),
  companyName: z.string().optional(),
  avatarUrl: z.string().url("Invalid avatar URL format").optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordPolicy,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
  token: z.string().min(1, "Reset token is required"),
  newPassword: passwordPolicy,
});

export const verifyEmailSchema = z.object({
  email: z.string().email("Invalid email format"),
  token: z.string().min(1, "Verification token is required"),
});

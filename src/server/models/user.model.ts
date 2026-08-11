import { UserRole } from "./role.model";

export interface UserProfile {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  companyName?: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  eventType: string;
  ipAddress: string;
  userAgent: string;
  userId?: string;
  status: "SUCCESS" | "FAILURE";
  details?: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  profile: UserProfile;
  passwordHistory: string[]; // Stores previous password hashes
  tokenVersion: number;       // Incremented on password change or global logout to invalidate active tokens
  mfaEnabled: boolean;
  mfaSecret?: string;
}

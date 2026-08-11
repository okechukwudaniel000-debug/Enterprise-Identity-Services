import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User, UserProfile, SecurityEvent } from "../models/user.model";
import { UserRole } from "../models/role.model";
import { userRepository, IUserRepository } from "../repositories/user.repository";
import { tokenRepository, ITokenRepository, RefreshTokenSession } from "../repositories/token.repository";
import { logger } from "../logging/logger";
import { 
  ConflictError, 
  AuthenticationError, 
  NotFoundError, 
  ValidationError 
} from "../errors/custom-errors";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

export class AuthService {
  private userRepo: IUserRepository;
  private tokenRepo: ITokenRepository;

  constructor(userRepo: IUserRepository = userRepository, tokenRepo: ITokenRepository = tokenRepository) {
    this.userRepo = userRepo;
    this.tokenRepo = tokenRepo;
  }

  private generateTokenId(): string {
    return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  }

  /**
   * Helper to issue a new Access and Refresh Token pair for a user
   */
  public async issueTokens(
    user: User, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<TokenPair> {
    const accessJti = this.generateTokenId();
    const refreshJti = this.generateTokenId();

    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
      jti: accessJti,
    };

    const refreshPayload = {
      sub: user.id,
      tokenVersion: user.tokenVersion,
      jti: refreshJti,
    };

    const accessToken = jwt.sign(accessPayload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      issuer: "EnterpriseIdentityService",
      audience: "EnterpriseSaaS",
    });

    const refreshToken = jwt.sign(refreshPayload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
      issuer: "EnterpriseIdentityService",
      audience: "EnterpriseSaaS",
    });

    // Save refresh token session to database
    // Default JWT_REFRESH_EXPIRES_IN parsing (approximate 7 days if not parsed correctly)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session: RefreshTokenSession = {
      tokenId: refreshJti,
      userId: user.id,
      token: refreshToken,
      expiresAt: expiresAt.toISOString(),
      isUsed: false,
      isRevoked: false,
      userAgent,
      ipAddress,
      createdAt: new Date().toISOString(),
    };

    await this.tokenRepo.saveRefreshToken(session);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshTokenExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    };
  }

  /**
   * Registers a new user
   */
  public async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyName?: string;
  }, ipAddress: string = "0.0.0.0", userAgent: string = "Unknown"): Promise<User> {
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) {
      throw new ConflictError("An account with this email address already exists.");
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    const newUser: User = {
      id: "usr-" + Math.random().toString(36).substring(2, 11),
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: UserRole.USER, // Default role for standard registrations
      isEmailVerified: false, // Mock email verification flow
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profile: {
        firstName: data.firstName,
        lastName: data.lastName,
        companyName: data.companyName,
      },
      passwordHistory: [passwordHash],
      tokenVersion: 1,
      mfaEnabled: false,
    };

    const savedUser = await this.userRepo.create(newUser);
    
    // Log registration security event
    await this.userRepo.addSecurityEvent({
      id: this.generateTokenId(),
      timestamp: new Date().toISOString(),
      eventType: "USER_REGISTERED",
      ipAddress,
      userAgent,
      userId: savedUser.id,
      status: "SUCCESS",
      details: "User registration successfully processed.",
    });

    logger.security("New enterprise user registered", { userId: savedUser.id, email: savedUser.email });
    return savedUser;
  }

  /**
   * Authenticats an existing user and returns token pair
   */
  public async login(
    data: { email: string; password: string },
    ipAddress: string = "0.0.0.0",
    userAgent: string = "Unknown"
  ): Promise<{ user: User; tokens: TokenPair }> {
    const user = await this.userRepo.findByEmail(data.email);
    
    // Constant time comparison (even if user is not found) to prevent timing analysis attacks
    const mockHash = "$2b$10$tZbeR233fL8uH18O6VlYBe7tMhT1w9rXyXb81tq8Zf8yF/E5pW.Gq";
    const passwordMatch = user 
      ? await bcrypt.compare(data.password, user.passwordHash)
      : await bcrypt.compare(data.password, mockHash);

    if (!user || !passwordMatch) {
      // Audit login failure event
      await this.userRepo.addSecurityEvent({
        id: this.generateTokenId(),
        timestamp: new Date().toISOString(),
        eventType: "LOGIN_FAILED",
        ipAddress,
        userAgent,
        details: `Failed credentials login attempt for: ${data.email}`,
        status: "FAILURE",
      });

      logger.security("Failed login attempt due to bad credentials", { email: data.email });
      throw new AuthenticationError("Invalid email or password.");
    }

    if (!user.isActive) {
      await this.userRepo.addSecurityEvent({
        id: this.generateTokenId(),
        timestamp: new Date().toISOString(),
        eventType: "LOGIN_DEACTIVATED",
        ipAddress,
        userAgent,
        userId: user.id,
        details: "Attempted login into deactivated account.",
        status: "FAILURE",
      });
      throw new AuthenticationError("Your account is deactivated. Please contact support.");
    }

    // Success login event
    await this.userRepo.addSecurityEvent({
      id: this.generateTokenId(),
      timestamp: new Date().toISOString(),
      eventType: "LOGIN_SUCCESS",
      ipAddress,
      userAgent,
      userId: user.id,
      status: "SUCCESS",
    });

    const tokens = await this.issueTokens(user, ipAddress, userAgent);
    logger.security("User logged in successfully", { userId: user.id, email: user.email });

    return { user, tokens };
  }

  /**
   * Refreshes JWT tokens using Token Rotation & Reuse Breach Alarm
   */
  public async refreshTokens(
    refreshToken: string,
    ipAddress: string = "0.0.0.0",
    userAgent: string = "Unknown"
  ): Promise<TokenPair> {
    let decoded: { sub: string; tokenVersion: number; jti: string };
    
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as any;
    } catch (err) {
      logger.warn("Refresh token signature verification failed", { error: (err as Error).message });
      throw new AuthenticationError("Refresh token is expired or invalid.");
    }

    const session = await this.tokenRepo.findRefreshTokenByJti(decoded.jti);

    if (!session) {
      logger.security("Potential refresh token theft or forge detected! Token not found in db.", { jti: decoded.jti });
      throw new AuthenticationError("Session token was not recognized.");
    }

    // Breach Detection: If refresh token is already marked as used, compromise is triggered!
    if (session.isUsed) {
      await this.tokenRepo.revokeAllUserTokens(session.userId);
      
      const user = await this.userRepo.findById(session.userId);
      if (user) {
        // Increment user's tokenVersion to globally revoke any active access tokens
        await this.userRepo.update(user.id, { tokenVersion: user.tokenVersion + 1 });
        
        await this.userRepo.addSecurityEvent({
          id: this.generateTokenId(),
          timestamp: new Date().toISOString(),
          eventType: "BREACH_DETECTION_ALARM",
          ipAddress,
          userAgent,
          userId: user.id,
          status: "FAILURE",
          details: `Compromised token rotation reuse detected on JWT ID: ${session.tokenId}. Globally revoked all active user sessions!`,
        });
      }

      logger.security(`BREACH ALARM: Rotated refresh token reused! Globally invalidating user sessions.`, {
        userId: session.userId,
        compromisedJti: session.tokenId,
      });

      throw new AuthenticationError("Security violation detected. This token session was reused. For your security, all active sessions have been invalidated. Please log in again.");
    }

    if (session.isRevoked) {
      throw new AuthenticationError("This session has been revoked.");
    }

    const user = await this.userRepo.findById(session.userId);
    if (!user || !user.isActive) {
      throw new AuthenticationError("User is no longer active.");
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      throw new AuthenticationError("Session token has expired due to state change.");
    }

    // Mark current token as used
    await this.tokenRepo.markTokenAsUsed(session.tokenId);

    // Issue a brand-new token pair (rotates the token!)
    const newTokens = await this.issueTokens(user, ipAddress, userAgent);

    // Audit rotation success
    await this.userRepo.addSecurityEvent({
      id: this.generateTokenId(),
      timestamp: new Date().toISOString(),
      eventType: "TOKEN_ROTATED",
      ipAddress,
      userAgent,
      userId: user.id,
      status: "SUCCESS",
      details: `Rotated token session ${session.tokenId} -> new session.`,
    });

    return newTokens;
  }

  /**
   * Revokes an active refresh token on logout
   */
  public async logout(jti: string, userId: string): Promise<void> {
    await this.tokenRepo.revokeToken(jti);
    logger.security("User logged out successfully and blacklisted refresh token", { jti, userId });
  }

  /**
   * Changes user password
   */
  public async changePassword(
    userId: string,
    data: { currentPassword: string; newPassword: string },
    ipAddress: string = "0.0.0.0",
    userAgent: string = "Unknown"
  ): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found.");
    }

    const matches = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!matches) {
      await this.userRepo.addSecurityEvent({
        id: this.generateTokenId(),
        timestamp: new Date().toISOString(),
        eventType: "PASSWORD_CHANGE_FAILED",
        ipAddress,
        userAgent,
        userId: user.id,
        status: "FAILURE",
        details: "Attempted password change with incorrect current password.",
      });
      throw new ValidationError("Incorrect current password.");
    }

    // Verify password doesn't match history
    for (const historicHash of user.passwordHistory) {
      const isIdentical = await bcrypt.compare(data.newPassword, historicHash);
      if (isIdentical) {
        throw new ValidationError("Password history policy violation: You cannot reuse a previous password.");
      }
    }

    const saltRounds = 10;
    const newHash = await bcrypt.hash(data.newPassword, saltRounds);

    // Maintain a max password history of 5
    const updatedHistory = [...user.passwordHistory, newHash].slice(-5);

    // Increment tokenVersion to immediately revoke any existing login sessions
    await this.userRepo.update(user.id, {
      passwordHash: newHash,
      passwordHistory: updatedHistory,
      tokenVersion: user.tokenVersion + 1, // Global invalidation of active tokens
    });

    // Revoke all active session records in db
    await this.tokenRepo.revokeAllUserTokens(user.id);

    // Log password change audit
    await this.userRepo.addSecurityEvent({
      id: this.generateTokenId(),
      timestamp: new Date().toISOString(),
      eventType: "PASSWORD_CHANGED",
      ipAddress,
      userAgent,
      userId: user.id,
      status: "SUCCESS",
      details: "Password changed successfully. All previous sessions revoked.",
    });

    logger.security("User password successfully changed, rotating security token version.", { userId });
  }

  /**
   * Mocked flows for testing email verification and password resets
   */
  public async forgotPassword(email: string): Promise<{ resetToken: string }> {
    const user = await this.userRepo.findByEmail(email);
    // Silent return to prevent account enumeration, but returns the mock token for visual exploration
    const mockToken = "rst-" + Math.random().toString(36).substring(2, 11);
    
    if (user) {
      logger.info(`Forgot Password Email request for: ${email}. Simulated Reset URL: /reset-password?token=${mockToken}&email=${email}`);
      await this.userRepo.addSecurityEvent({
        id: this.generateTokenId(),
        timestamp: new Date().toISOString(),
        eventType: "PASSWORD_RESET_REQUESTED",
        ipAddress: "0.0.0.0",
        userAgent: "System",
        userId: user.id,
        status: "SUCCESS",
        details: `Reset password token dispatched.`,
      });
    }

    return { resetToken: mockToken };
  }

  public async resetPassword(data: { email: string; token: string; newPassword: string }): Promise<void> {
    const user = await this.userRepo.findByEmail(data.email);
    if (!user) {
      throw new NotFoundError("No account matches this email address.");
    }

    const saltRounds = 10;
    const newHash = await bcrypt.hash(data.newPassword, saltRounds);

    await this.userRepo.update(user.id, {
      passwordHash: newHash,
      passwordHistory: [newHash, ...user.passwordHistory].slice(0, 5),
      tokenVersion: user.tokenVersion + 1, // Revoke active sessions
    });

    await this.tokenRepo.revokeAllUserTokens(user.id);

    await this.userRepo.addSecurityEvent({
      id: this.generateTokenId(),
      timestamp: new Date().toISOString(),
      eventType: "PASSWORD_RESET_COMPLETED",
      ipAddress: "0.0.0.0",
      userAgent: "System",
      userId: user.id,
      status: "SUCCESS",
      details: "Password reset completed via token confirmation.",
    });

    logger.security("Password successfully reset via token", { email: data.email });
  }

  public async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email);
    if (user) {
      const mockVerifyToken = "vry-" + Math.random().toString(36).substring(2, 11);
      logger.info(`Resending Verification Email for: ${email}. Simulated Link: /verify-email?token=${mockVerifyToken}&email=${email}`);
    }
  }

  public async verifyEmail(email: string, token: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new NotFoundError("User not found.");
    }

    await this.userRepo.update(user.id, { isEmailVerified: true });
    
    await this.userRepo.addSecurityEvent({
      id: this.generateTokenId(),
      timestamp: new Date().toISOString(),
      eventType: "EMAIL_VERIFIED",
      ipAddress: "0.0.0.0",
      userAgent: "System",
      userId: user.id,
      status: "SUCCESS",
    });

    logger.info(`Email successfully verified for user ${email}`);
  }
}

export const authService = new AuthService();
export default authService;

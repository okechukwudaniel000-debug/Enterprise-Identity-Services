import { logger } from "../logging/logger";

export interface RefreshTokenSession {
  tokenId: string; // The specific jti of the refresh token
  userId: string;
  token: string;
  expiresAt: string;
  isUsed: boolean;
  isRevoked: boolean;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface ITokenRepository {
  saveRefreshToken(session: RefreshTokenSession): Promise<void>;
  findRefreshToken(token: string): Promise<RefreshTokenSession | null>;
  findRefreshTokenByJti(jti: string): Promise<RefreshTokenSession | null>;
  markTokenAsUsed(jti: string): Promise<void>;
  revokeToken(jti: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;
  isTokenBlacklisted(jti: string): Promise<boolean>;
  blacklistToken(jti: string, expiresAt: string): Promise<void>;
  getActiveSessions(userId?: string): Promise<RefreshTokenSession[]>;
}

export class InMemoryTokenRepository implements ITokenRepository {
  private sessions: Map<string, RefreshTokenSession> = new Map(); // Key: jti
  private blacklist: Map<string, string> = new Map();             // Key: jti, Value: expiresAt

  public async saveRefreshToken(session: RefreshTokenSession): Promise<void> {
    this.sessions.set(session.tokenId, { ...session });
  }

  public async findRefreshToken(token: string): Promise<RefreshTokenSession | null> {
    for (const session of this.sessions.values()) {
      if (session.token === token) {
        return { ...session };
      }
    }
    return null;
  }

  public async findRefreshTokenByJti(jti: string): Promise<RefreshTokenSession | null> {
    const session = this.sessions.get(jti);
    return session ? { ...session } : null;
  }

  public async markTokenAsUsed(jti: string): Promise<void> {
    const session = this.sessions.get(jti);
    if (session) {
      session.isUsed = true;
      this.sessions.set(jti, session);
    }
  }

  public async revokeToken(jti: string): Promise<void> {
    const session = this.sessions.get(jti);
    if (session) {
      session.isRevoked = true;
      this.sessions.set(jti, session);
    }
    await this.blacklistToken(jti, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
  }

  public async revokeAllUserTokens(userId: string): Promise<void> {
    logger.security("Revoking all active refresh token sessions for user due to password change or breach action.", { userId });
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.isRevoked) {
        session.isRevoked = true;
        this.sessions.set(session.tokenId, session);
        this.blacklist.set(session.tokenId, session.expiresAt);
      }
    }
  }

  public async isTokenBlacklisted(jti: string): Promise<boolean> {
    // Check if token in blacklist map
    if (this.blacklist.has(jti)) {
      const expiresAt = this.blacklist.get(jti)!;
      if (new Date(expiresAt) > new Date()) {
        return true;
      } else {
        // Clean up expired blacklist item
        this.blacklist.delete(jti);
      }
    }
    return false;
  }

  public async blacklistToken(jti: string, expiresAt: string): Promise<void> {
    this.blacklist.set(jti, expiresAt);
  }

  public async getActiveSessions(userId?: string): Promise<RefreshTokenSession[]> {
    const active = Array.from(this.sessions.values())
      .filter(s => !s.isRevoked && new Date(s.expiresAt) > new Date());
    
    if (userId) {
      return active.filter(s => s.userId === userId);
    }
    return active;
  }
}

export const tokenRepository = new InMemoryTokenRepository();

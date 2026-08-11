import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthenticationError } from "../errors/custom-errors";
import { userRepository } from "../repositories/user.repository";
import { tokenRepository } from "../repositories/token.repository";
import { logger } from "../logging/logger";

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  tokenVersion: number;
  jti: string;
}

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // 1. Try to extract token from Authorization Header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // 2. Fallback to cookies if available
    if (!token && req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new AuthenticationError("Authentication required. Please provide a Bearer token or accessToken cookie.");
    }

    // 3. Verify access token signature
    let decoded: AccessTokenPayload;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    } catch (err) {
      logger.warn("JWT access token signature verification failed", { error: (err as Error).message }, req.requestId);
      throw new AuthenticationError("Access token is invalid or expired.");
    }

    // 4. Verify token is not blacklisted
    const isBlacklisted = await tokenRepository.isTokenBlacklisted(decoded.jti);
    if (isBlacklisted) {
      logger.security("Attempted access with blacklisted access token!", { jti: decoded.jti, userId: decoded.sub }, req.requestId);
      throw new AuthenticationError("Access token has been revoked.");
    }

    // 5. Fetch user and verify state
    const user = await userRepository.findById(decoded.sub);
    if (!user) {
      throw new AuthenticationError("User associated with this token does not exist.");
    }

    if (!user.isActive) {
      logger.security("Authentication attempt by deactivated user account", { userId: user.id }, req.requestId);
      throw new AuthenticationError("Your account is deactivated. Please contact support.");
    }

    // 6. Verify token versioning match (enforces instant logout/password rotation revocation)
    if (user.tokenVersion !== decoded.tokenVersion) {
      logger.security("Revoked token version detected! Token version is stale.", {
        userId: user.id,
        userCurrentVersion: user.tokenVersion,
        tokenVersion: decoded.tokenVersion,
      }, req.requestId);
      throw new AuthenticationError("Token version is stale. Session has been revoked, please log in again.");
    }

    // 7. Attach validated user details to Request object
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
      jti: decoded.jti,
    };

    next();
  } catch (error) {
    next(error);
  }
};

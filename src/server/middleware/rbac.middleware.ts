import { Request, Response, NextFunction } from "express";
import { UserRole, UserPermission, RolePermissions } from "../models/role.model";
import { AuthorizationError, AuthenticationError } from "../errors/custom-errors";
import { logger } from "../logging/logger";

/**
 * Restricts access to specific role(s)
 */
export const requireRole = (allowedRoles: UserRole | UserRole[]) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError("Authentication context is missing.");
      }

      const hasRole = roles.includes(req.user.role as UserRole);
      if (!hasRole) {
        logger.security(`Unauthorized role attempt: User [${req.user.email}] with role [${req.user.role}] tried to access resource requiring roles [${roles.join(", ")}]`, {
          userId: req.user.id,
          role: req.user.role,
          requiredRoles: roles,
        }, req.requestId);
        
        throw new AuthorizationError(`Access denied. This action requires one of the following roles: ${roles.join(", ")}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Restricts access to users holding a specific fine-grained Permission
 */
export const requirePermission = (requiredPermission: UserPermission) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError("Authentication context is missing.");
      }

      const userRole = req.user.role as UserRole;
      const permissions = RolePermissions[userRole] || [];

      const hasPermission = permissions.includes(requiredPermission);
      if (!hasPermission) {
        logger.security(`Unauthorized permission attempt: User [${req.user.email}] tried to perform action [${requiredPermission}] requiring privileges.`, {
          userId: req.user.id,
          role: userRole,
          requiredPermission,
        }, req.requestId);

        throw new AuthorizationError(`Access denied. You do not have permission to execute this action: ${requiredPermission}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

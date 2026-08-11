export enum UserRole {
  ADMIN = "Admin",
  MANAGER = "Manager",
  USER = "User",
  GUEST = "Guest",
}

export enum UserPermission {
  CREATE_USER = "users:create",
  DELETE_USER = "users:delete",
  MANAGE_USERS = "users:manage",
  READ_PROFILE = "profile:read",
  UPDATE_PROFILE = "profile:update",
  ADMIN_DASHBOARD = "admin:dashboard",
  PROTECTED_RESOURCES = "resources:protected",
}

// Maps each role to its list of granted permissions
export const RolePermissions: Record<UserRole, UserPermission[]> = {
  [UserRole.ADMIN]: [
    UserPermission.CREATE_USER,
    UserPermission.DELETE_USER,
    UserPermission.MANAGE_USERS,
    UserPermission.READ_PROFILE,
    UserPermission.UPDATE_PROFILE,
    UserPermission.ADMIN_DASHBOARD,
    UserPermission.PROTECTED_RESOURCES,
  ],
  [UserRole.MANAGER]: [
    UserPermission.CREATE_USER,
    UserPermission.READ_PROFILE,
    UserPermission.UPDATE_PROFILE,
    UserPermission.PROTECTED_RESOURCES,
  ],
  [UserRole.USER]: [
    UserPermission.READ_PROFILE,
    UserPermission.UPDATE_PROFILE,
    UserPermission.PROTECTED_RESOURCES,
  ],
  [UserRole.GUEST]: [
    UserPermission.READ_PROFILE,
  ],
};

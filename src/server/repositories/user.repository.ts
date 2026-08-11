import bcrypt from "bcrypt";
import { User, SecurityEvent } from "../models/user.model";
import { UserRole } from "../models/role.model";
import { logger } from "../logging/logger";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(id: string, updates: Partial<User>): Promise<User>;
  delete(id: string): Promise<boolean>;
  findAll(): Promise<User[]>;
  addSecurityEvent(event: SecurityEvent): Promise<void>;
  getSecurityEvents(userId?: string): Promise<SecurityEvent[]>;
}

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();
  private securityEvents: SecurityEvent[] = [];

  constructor() {
    this.seedDefaultUsers();
  }

  private async seedDefaultUsers() {
    try {
      logger.info("Initializing in-memory repository and seeding default enterprise users...");

      const saltRounds = 10;
      const adminPasswordHash = await bcrypt.hash("EnterpriseAdmin2026!", saltRounds);
      const managerPasswordHash = await bcrypt.hash("EnterpriseManager2026!", saltRounds);
      const userPasswordHash = await bcrypt.hash("EnterpriseUser2026!", saltRounds);

      const defaultUsers: User[] = [
        {
          id: "usr-admin-01",
          email: "admin@enterprise.com",
          passwordHash: adminPasswordHash,
          role: UserRole.ADMIN,
          isEmailVerified: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          profile: {
            firstName: "Sarah",
            lastName: "Connor",
            companyName: "Cyberdyne Systems",
            avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"
          },
          passwordHistory: [adminPasswordHash],
          tokenVersion: 1,
          mfaEnabled: false,
        },
        {
          id: "usr-manager-02",
          email: "manager@enterprise.com",
          passwordHash: managerPasswordHash,
          role: UserRole.MANAGER,
          isEmailVerified: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          profile: {
            firstName: "John",
            lastName: "Miller",
            companyName: "Acme Corp",
            avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150"
          },
          passwordHistory: [managerPasswordHash],
          tokenVersion: 1,
          mfaEnabled: false,
        },
        {
          id: "usr-standard-03",
          email: "user@enterprise.com",
          passwordHash: userPasswordHash,
          role: UserRole.USER,
          isEmailVerified: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          profile: {
            firstName: "David",
            lastName: "Goliath",
            companyName: "Stark Industries",
            avatarUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=150"
          },
          passwordHistory: [userPasswordHash],
          tokenVersion: 1,
          mfaEnabled: false,
        },
      ];

      for (const u of defaultUsers) {
        this.users.set(u.id, u);
      }
      logger.info("Default enterprise users seeded successfully.", {
        accounts: ["admin@enterprise.com", "manager@enterprise.com", "user@enterprise.com"]
      });
    } catch (err) {
      logger.error("Failed to seed in-memory users!", { error: (err as Error).message });
    }
  }

  public async findById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  public async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase().trim() === normalizedEmail) {
        return { ...user };
      }
    }
    return null;
  }

  public async create(user: User): Promise<User> {
    const savedUser = { ...user, email: user.email.toLowerCase().trim() };
    this.users.set(savedUser.id, savedUser);
    return { ...savedUser };
  }

  public async update(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found.`);
    }

    const updatedUser = {
      ...user,
      ...updates,
      profile: {
        ...user.profile,
        ...(updates.profile || {}),
      },
      updatedAt: new Date().toISOString(),
    };

    this.users.set(id, updatedUser);
    return { ...updatedUser };
  }

  public async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  public async findAll(): Promise<User[]> {
    return Array.from(this.users.values()).map(u => ({ ...u }));
  }

  public async addSecurityEvent(event: SecurityEvent): Promise<void> {
    this.securityEvents.unshift(event);
    if (this.securityEvents.length > 1000) {
      this.securityEvents.pop();
    }
  }

  public async getSecurityEvents(userId?: string): Promise<SecurityEvent[]> {
    if (userId) {
      return this.securityEvents.filter(e => e.userId === userId);
    }
    return [...this.securityEvents];
  }
}

export const userRepository = new InMemoryUserRepository();

import { User } from '../entities/user.aggregate';
import { Session } from '../entities/session.aggregate';
import { Role, Permission } from '../entities/role.aggregate';
import { EntityManager } from 'typeorm';

// ─── User Repository ──────────────────────────────────────────────────────────

export interface IUserRepository {
  save(user: User, manager?: EntityManager): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
}
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

// ─── Session Repository ───────────────────────────────────────────────────────

export interface ISessionRepository {
  save(session: Session, manager?: EntityManager): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  findById(id: string): Promise<Session | null>;
  findActiveByUserId(userId: string): Promise<Session[]>;
  revokeById(id: string): Promise<void>;
  revokeAllByUserId(userId: string): Promise<void>;
}
export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');

// ─── Role Repository ──────────────────────────────────────────────────────────

export interface IRoleRepository {
  findByName(name: string): Promise<Role | null>;
  findById(id: string): Promise<Role | null>;
  findAll(): Promise<Role[]>;
  findRolesByUserId(userId: string): Promise<Role[]>;
  assignRoleToUser(
    userId: string,
    roleId: string,
    assignedBy: string | null,
    expiresAt?: Date,
  ): Promise<void>;
  revokeRoleFromUser(userId: string, roleId: string): Promise<void>;
}
export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');

// ─── Permission Repository ────────────────────────────────────────────────────

export interface IPermissionRepository {
  findByUserId(userId: string): Promise<Permission[]>;
}
export const PERMISSION_REPOSITORY = Symbol('PERMISSION_REPOSITORY');

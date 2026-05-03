import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, Permission } from '../../../../domain/entities/role.aggregate';
import { IRoleRepository } from '../../../../domain/repositories/auth.repository.interface';
import {
  RoleOrmEntity, PermissionOrmEntity,
  RolePermissionOrmEntity, UserRoleOrmEntity,
} from '../entities/auth.orm-entities';

@Injectable()
export class RoleRepository implements IRoleRepository {
  constructor(
    @InjectRepository(RoleOrmEntity)
    private readonly roleRepo: Repository<RoleOrmEntity>,
    @InjectRepository(PermissionOrmEntity)
    private readonly permRepo: Repository<PermissionOrmEntity>,
    @InjectRepository(RolePermissionOrmEntity)
    private readonly rolePerm: Repository<RolePermissionOrmEntity>,
    @InjectRepository(UserRoleOrmEntity)
    private readonly userRole: Repository<UserRoleOrmEntity>,
  ) {}

  private async buildRole(e: RoleOrmEntity): Promise<Role> {
    const rolePerms = await this.rolePerm.find({ where: { roleId: e.id } });
    const permissions: Permission[] = await Promise.all(
      rolePerms.map(async (rp) => {
        const perm = await this.permRepo.findOne({ where: { id: rp.permissionId } });
        return perm
          ? { id: perm.id, name: perm.name, resource: perm.resource, action: perm.action }
          : null;
      }),
    ).then((arr) => arr.filter(Boolean) as Permission[]);

    return Role.reconstitute({
      id: e.id,
      name: e.name,
      description: e.description,
      isSystem: e.isSystem,
      permissions,
      createdAt: e.createdAt,
    });
  }

  async findByName(name: string): Promise<Role | null> {
    const e = await this.roleRepo.findOne({ where: { name } });
    return e ? this.buildRole(e) : null;
  }

  async findById(id: string): Promise<Role | null> {
    const e = await this.roleRepo.findOne({ where: { id } });
    return e ? this.buildRole(e) : null;
  }

  async findAll(): Promise<Role[]> {
    const entities = await this.roleRepo.find();
    return Promise.all(entities.map((e) => this.buildRole(e)));
  }

  async findRolesByUserId(userId: string): Promise<Role[]> {
    const now = new Date();
    const userRoles = await this.userRole.find({ where: { userId } });
    const validRoles = userRoles.filter(
      (ur) => !ur.expiresAt || ur.expiresAt > now,
    );
    return Promise.all(
      validRoles.map(async (ur) => {
        const role = await this.roleRepo.findOne({ where: { id: ur.roleId } });
        return role ? this.buildRole(role) : null;
      }),
    ).then((arr) => arr.filter(Boolean) as Role[]);
  }

  async assignRoleToUser(
    userId: string,
    roleId: string,
    assignedBy: string | null,
    expiresAt?: Date,
  ): Promise<void> {
    await this.userRole.upsert(
      { userId, roleId, assignedBy, expiresAt: expiresAt ?? null },
      ['userId', 'roleId'],
    );
  }

  async revokeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.userRole.delete({ userId, roleId });
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { User, UserStatus } from '../../../../domain/entities/user.aggregate';
import { IUserRepository } from '../../../../domain/repositories/auth.repository.interface';
import { UserOrmEntity } from '../entities/auth.orm-entities';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repo: Repository<UserOrmEntity>,
  ) {}

  private toDomain(e: UserOrmEntity): User {
    return User.reconstitute({
      id: e.id,
      email: e.email,
      fullName: e.fullName,
      phone: e.phone,
      dateOfBirth: e.dateOfBirth,
      passwordHash: e.passwordHash,
      status: e.status as UserStatus,
      emailVerified: e.emailVerified,
      mfaEnabled: e.mfaEnabled,
      mfaSecret: e.mfaSecret,
      failedLoginCount: e.failedLoginCount,
      lockedUntil: e.lockedUntil,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    });
  }

  private toOrm(user: User): Partial<UserOrmEntity> {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      passwordHash: user.passwordHash,
      status: user.status,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      mfaSecret: user.mfaSecret,
      failedLoginCount: user.failedLoginCount,
      lockedUntil: user.lockedUntil,
    };
  }

  async save(user: User, manager?: EntityManager): Promise<void> {
    const orm = this.toOrm(user);
    if (manager) {
      await manager.save(UserOrmEntity, orm);
    } else {
      await this.repo.save(orm);
    }
  }

  async findById(id: string): Promise<User | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.toDomain(e) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const e = await this.repo.findOne({ where: { email: email.toLowerCase().trim() } });
    return e ? this.toDomain(e) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.repo.existsBy({ email: email.toLowerCase().trim() });
  }
}

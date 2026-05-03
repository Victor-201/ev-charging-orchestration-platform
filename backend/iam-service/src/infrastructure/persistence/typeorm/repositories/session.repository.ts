import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, IsNull } from 'typeorm';
import { Session } from '../../../../domain/entities/session.aggregate';
import { ISessionRepository } from '../../../../domain/repositories/auth.repository.interface';
import { SessionOrmEntity } from '../entities/auth.orm-entities';

@Injectable()
export class SessionRepository implements ISessionRepository {
  constructor(
    @InjectRepository(SessionOrmEntity)
    private readonly repo: Repository<SessionOrmEntity>,
  ) {}

  private toDomain(e: SessionOrmEntity): Session {
    return Session.reconstitute({
      id: e.id,
      userId: e.userId,
      refreshTokenHash: e.refreshTokenHash,
      deviceFingerprint: e.deviceFingerprint,
      ipAddress: e.ipAddress,
      userAgent: e.userAgent,
      expiresAt: e.expiresAt,
      revokedAt: e.revokedAt,
      createdAt: e.createdAt,
    });
  }

  private toOrm(session: Session): SessionOrmEntity {
    const e = new SessionOrmEntity();
    e.id = session.id;
    e.userId = session.userId;
    e.refreshTokenHash = session.refreshTokenHash;
    e.deviceFingerprint = session.deviceFingerprint;
    e.ipAddress = session.ipAddress;
    e.userAgent = session.userAgent;
    e.expiresAt = session.expiresAt;
    e.revokedAt = session.revokedAt;
    return e;
  }

  async save(session: Session, manager?: EntityManager): Promise<void> {
    const orm = this.toOrm(session);
    if (manager) {
      await manager.save(SessionOrmEntity, orm);
    } else {
      await this.repo.save(orm);
    }
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const e = await this.repo.findOne({
      where: { refreshTokenHash: tokenHash },
    });
    return e ? this.toDomain(e) : null;
  }

  async findById(id: string): Promise<Session | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.toDomain(e) : null;
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    const now = new Date();
    const entities = await this.repo
      .createQueryBuilder('s')
      .where('s.user_id = :userId', { userId })
      .andWhere('s.revoked_at IS NULL')
      .andWhere('s.expires_at > :now', { now })
      .orderBy('s.created_at', 'DESC')
      .getMany();
    return entities.map((e) => this.toDomain(e));
  }

  async revokeById(id: string): Promise<void> {
    await this.repo.update({ id }, { revokedAt: new Date() });
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.repo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }
}

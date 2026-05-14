import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ChargingSession,
  SessionStatus,
  SessionInitiator,
} from '../../../../domain/entities/charging-session.aggregate';
import { ISessionRepository } from '../../../../domain/repositories/session.repository.interface';
import { SessionOrmEntity } from '../entities/session.orm-entities';

/**
 * SessionRepository - Anti-corruption layer.
 * Converts between ORM entities and domain aggregate.
 * Do not expose ORM entity outside infrastructure.
 */
@Injectable()
export class SessionRepository implements ISessionRepository {
  constructor(
    @InjectRepository(SessionOrmEntity)
    private readonly repo: Repository<SessionOrmEntity>,
  ) {}

  async save(session: ChargingSession): Promise<void> {
    await this.repo.save(this.toOrm(session));
  }

  async findById(id: string): Promise<ChargingSession | null> {
    const e = await this.repo.findOneBy({ id });
    return e ? this.toDomain(e) : null;
  }

  async findActiveByCharger(chargerId: string): Promise<ChargingSession | null> {
    const e = await this.repo.findOne({
      where: { chargerId, status: 'active' as any },
    });
    return e ? this.toDomain(e) : null;
  }

  async findActiveByUser(userId: string): Promise<ChargingSession | null> {
    const e = await this.repo.findOne({
      where: { userId, status: 'active' as any },
    });
    return e ? this.toDomain(e) : null;
  }

  async findByBookingId(bookingId: string): Promise<ChargingSession | null> {
    const e = await this.repo.findOneBy({ bookingId });
    return e ? this.toDomain(e) : null;
  }

  async findByUserId(userId: string, limit = 20): Promise<ChargingSession[]> {
    const entities = await this.repo.find({
      where:  { userId },
      order:  { startTime: 'DESC' },
      take:   limit,
    });
    return entities.map(this.toDomain.bind(this));
  }

  async findStoppedBefore(cutoff: Date): Promise<ChargingSession[]> {
    const entities = await this.repo
      .createQueryBuilder('s')
      .where("s.status = 'stopped'")
      .andWhere('s.end_time <= :cutoff', { cutoff })
      .getMany();
    return entities.map(this.toDomain.bind(this));
  }

  async findByIdempotencyKey(key: string): Promise<ChargingSession | null> {
    const e = await this.repo.findOneBy({ idempotencyKey: key } as any);
    return e ? this.toDomain(e) : null;
  }

  // Mapping helpers

  private toOrm(s: ChargingSession): SessionOrmEntity {
    const e              = new SessionOrmEntity();
    e.id                 = s.id;
    e.userId             = s.userId;
    e.chargerId          = s.chargerId;
    e.bookingId          = s.bookingId;
    e.initiatedBy        = s.initiatedBy;
    e.startMeterWh       = s.startMeterWh;
    e.status             = s.status;
    e.startTime          = s.startTime;
    e.endTime            = s.endTime;
    e.endMeterWh         = s.endMeterWh;
    e.errorReason        = s.errorReason;
    (e as any).idempotencyKey = s.idempotencyKey;
    return e;
  }

  private toDomain(e: SessionOrmEntity): ChargingSession {
    return ChargingSession.reconstitute({
      id:              e.id,
      userId:          e.userId,
      chargerId:       e.chargerId,
      bookingId:       e.bookingId,
      initiatedBy:     (e.initiatedBy ?? 'user') as SessionInitiator,
      startMeterWh:    Number(e.startMeterWh),
      idempotencyKey:  (e as any).idempotencyKey ?? null,
      status:          e.status as SessionStatus,
      startTime:       e.startTime,
      endTime:         e.endTime,
      endMeterWh:      e.endMeterWh !== null ? Number(e.endMeterWh) : null,
      errorReason:     e.errorReason,
      createdAt:       e.createdAt,
      updatedAt:       e.createdAt,
    });
  }
}


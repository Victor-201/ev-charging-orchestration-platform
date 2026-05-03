import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  IDLE_GRACE_MINUTES,
  IDLE_FEE_PER_MINUTE_VND,
} from '../../domain/entities/charging-session.aggregate';
import {
  SessionOrmEntity,
  OutboxOrmEntity,
} from '../../infrastructure/persistence/typeorm/entities/session.orm-entities';
import { SessionCompletedEvent } from '../../domain/events/charging.events';

/**
 * IdleFeeDetectionJob
 *
 * Chạy mỗi 1 phút.
 * Tìm các session có status = 'stopped' (sạc xong) nhưng chưa rút súng.
 * Sau khi hết 15 phút ân hạn → tính 2,000 VND/phút thêm vào idle_fee_vnd.
 *
 * Khi Billing được trigger (session.completed), tổng phí = energyFee + idleFee
 * sẽ được dùng để đối soát với deposit.
 */
@Injectable()
export class IdleFeeDetectionJob {
  private readonly logger = new Logger(IdleFeeDetectionJob.name);

  constructor(
    @InjectRepository(SessionOrmEntity)
    private readonly sessionRepo: Repository<SessionOrmEntity>,
    private readonly dataSource: DataSource,
  ) {}

  @Cron('* * * * *')
  async run(): Promise<void> {
    const graceEndTime = new Date(Date.now() - IDLE_GRACE_MINUTES * 60_000);

    // Tìm session đã stop nhưng chưa billed, và đã qua 15 phút ân hạn
    const idleSessions = await this.sessionRepo
      .createQueryBuilder('s')
      .where("s.status = 'stopped'")
      .andWhere('s.end_time IS NOT NULL')
      .andWhere('s.end_time <= :graceEndTime', { graceEndTime })
      .getMany();

    if (idleSessions.length === 0) return;

    this.logger.warn(`Idle fee detection: ${idleSessions.length} sessions occupying charger`);

    for (const session of idleSessions) {
      const idleMinutes = Math.floor(
        (Date.now() - session.endTime!.getTime()) / 60_000 - IDLE_GRACE_MINUTES,
      );
      if (idleMinutes <= 0) continue;

      // Phí theo phút thực tế (2,000 VND/phút)
      const idleFeeIncrement = IDLE_FEE_PER_MINUTE_VND;
      const newIdleFee = ((session as any).idleFeeVnd ?? 0) + idleFeeIncrement;

      await this.sessionRepo.update(session.id, {
        idleFeeVnd: newIdleFee,
        updatedAt:  new Date(),
      } as any);

      this.logger.warn(
        `Idle fee: session=${session.id} charger=${session.chargerId} ` +
        `idle=${idleMinutes}min total_idle_fee=${newIdleFee}VND`,
      );
    }
  }
}

/**
 * IdleFeeCompletedJob
 *
 * Khi user rút súng sạc (session.billed hoặc OCPP signal):
 * Emit SessionCompletedEvent với đầy đủ energyFeeVnd + idleFeeVnd
 * để Payment Service thực hiện billing reconciliation.
 *
 * Lưu ý: event này thực tế được emit tại StopSessionUseCase.
 * Job này chỉ handle trường hợp session bị kẹt (fallback).
 */
@Injectable()
export class StoppedSessionBillingJob {
  private readonly logger = new Logger(StoppedSessionBillingJob.name);

  static readonly BILLING_TIMEOUT_MINUTES = 60; // emit billing sau 60 phút nếu chưa được bill

  constructor(
    @InjectRepository(SessionOrmEntity)
    private readonly sessionRepo: Repository<SessionOrmEntity>,
    @InjectRepository(OutboxOrmEntity)
    private readonly outboxRepo: Repository<OutboxOrmEntity>,
    private readonly dataSource: DataSource,
  ) {}

  @Cron('*/5 * * * *') // mỗi 5 phút
  async run(): Promise<void> {
    const cutoff = new Date(
      Date.now() - StoppedSessionBillingJob.BILLING_TIMEOUT_MINUTES * 60_000,
    );

    const stuckSessions = await this.sessionRepo
      .createQueryBuilder('s')
      .where("s.status = 'stopped'")
      .andWhere('s.end_time <= :cutoff', { cutoff })
      .getMany();

    if (stuckSessions.length === 0) return;

    this.logger.warn(`Stuck stopped sessions: ${stuckSessions.length} — force billing`);

    for (const s of stuckSessions) {
      const durationMs = (s.endTime!.getTime() - s.startTime.getTime());
      const durationMin = Math.round(durationMs / 60_000);
      const kwhConsumed = s.endMeterWh != null
        ? (Number(s.endMeterWh) - Number(s.startMeterWh)) / 1000
        : 0;

      const event = new SessionCompletedEvent(
        s.id,
        s.userId,
        s.chargerId,
        s.bookingId,
        kwhConsumed,
        s.endTime!,
        durationMin,
        (s as any).energyFeeVnd ?? 0,
        (s as any).idleFeeVnd ?? 0,
        (s as any).depositAmount ?? 0,
        (s as any).depositTransactionId ?? null,
      );

      await this.outboxRepo.save(
        this.outboxRepo.create({
          id:            uuidv4(),
          aggregateType: 'session',
          aggregateId:   s.id,
          eventType:     event.eventType,
          payload:       { ...event } as object,
          status:        'pending',
          publishedAt:   null,
        }),
      );

      this.logger.log(`Force-billing session=${s.id}`);
    }
  }
}

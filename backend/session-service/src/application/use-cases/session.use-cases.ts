import { Injectable, Logger, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { v4 as uuidv4 } from 'uuid';

// Domain
import { ChargingSession } from '../../domain/entities/charging-session.aggregate';
import { TelemetryReading } from '../../domain/value-objects/telemetry.vo';
import {
  ChargingSessionException,
  InvalidSessionStateException,
} from '../../domain/exceptions/charging.exceptions';
import {
  ISessionRepository,
  SESSION_REPOSITORY,
} from '../../domain/repositories/session.repository.interface';
import {
  SessionStartedEvent,
  SessionActivatedEvent,
  SessionCompletedEvent,
  SessionInterruptedEvent,
  SessionErrorEvent,
  SessionTelemetryEvent,
} from '../../domain/events/charging.events';

// Infrastructure
import {
  SessionOrmEntity,
  TelemetryOrmEntity,
  ProcessedEventOrmEntity,
  OutboxOrmEntity,
  ChargerStateOrmEntity,
  BookingReadModelOrmEntity,
} from '../../infrastructure/persistence/typeorm/entities/session.orm-entities';



function buildOutboxEntry(
  mgr: EntityManager,
  event: { eventType: string; [key: string]: any },
  aggregateId: string,
): OutboxOrmEntity {
  return mgr.create(OutboxOrmEntity, {
    id:            uuidv4(),
    aggregateType: 'session',
    aggregateId,
    eventType:     event.eventType,
    payload:       { ...event } as object,
    status:        'pending',
    publishedAt:   null,
  });
}



/**
 * Starts a charging session.
 *
 * Guards:
 * - Prevents session if charger is occupied
 * - If booking already has an associated session -> conflict
 * - Booking: validates QR time window (startTime ± 15 mins)
 * - Walk-in: ChargingArrearsGuard blocks bad debt before reaching this point
 *
 * Flow:
 * 1. If bookingId exists -> validate QR time window from booking_read_models
 * 2. Create ChargingSession aggregate (status=pending)
 * 3. Activate immediately (pending -> active)
 * 4. Persist + outbox event (session.started)
 * 5. Update charger state -> occupied
 */
@Injectable()
export class StartSessionUseCase {
  private readonly logger = new Logger(StartSessionUseCase.name);

  /** Allowed early entry before booking time: 15 minutes */
  private static readonly EARLY_ENTRY_MS = 15 * 60_000;
  /** Allowed late buffer after booking end: 5 minutes */
  private static readonly LATE_BUFFER_MS = 5 * 60_000;

  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessionRepo: ISessionRepository,
    @InjectRepository(BookingReadModelOrmEntity)
    private readonly bookingRmRepo: Repository<BookingReadModelOrmEntity>,
    private readonly ds: DataSource,
  ) {}

  async execute(cmd: {
    userId: string;        // Always taken from JWT, never trust body
    chargerId: string;
    bookingId?: string;   // User might scan QR for a pre-existing booking
    startMeterWh?: number;
  }): Promise<ChargingSession> {
    // Guard 0: Validate QR time window (if booking exists)
    let bookingDepositAmount = 0;
    let bookingDepositTransactionId: string | null = null;

    if (cmd.bookingId) {
      const bookingRm = await this.bookingRmRepo.findOneBy({ bookingId: cmd.bookingId });

      if (!bookingRm) {
        throw new ConflictException(
          `Booking ${cmd.bookingId} does not exist or is not confirmed. ` +
          `Please wait for payment confirmation.`,
        );
      }

      // Ownership check
      if (bookingRm.userId !== cmd.userId) {
        throw new ConflictException(
          `Booking ${cmd.bookingId} does not belong to the current account.`,
        );
      }

      // Time window check
      const now = Date.now();
      const earliest = bookingRm.startTime.getTime() - StartSessionUseCase.EARLY_ENTRY_MS;
      const latest   = bookingRm.endTime.getTime()   + StartSessionUseCase.LATE_BUFFER_MS;

      if (now < earliest) {
        const minutesUntil = Math.ceil((earliest - now) / 60_000);
        throw new ConflictException(
          `It is not yet time for your charging session. You can start in ${minutesUntil} minutes ` +
          `(from ${new Date(earliest).toISOString().split('T')[1].substring(0, 5)}).`,
        );
      }

      if (now > latest) {
        throw new ConflictException(
          `Booking ${cmd.bookingId} has expired. ` +
          `The slot ended at ${bookingRm.endTime.toISOString().split('T')[1].substring(0, 5)}.`,
        );
      }

      // Matching charger check
      if (bookingRm.chargerId !== cmd.chargerId) {
        throw new ConflictException(
          `This booking is for another charger (${bookingRm.chargerId}), not ${cmd.chargerId}.`,
        );
      }

      bookingDepositAmount         = Number(bookingRm.depositAmount);
      bookingDepositTransactionId  = bookingRm.depositTransactionId;

      this.logger.log(
        `QR time window OK: booking=${cmd.bookingId} ` +
        `window=[${bookingRm.startTime.toISOString()}, ${bookingRm.endTime.toISOString()}]`,
      );
    }

    return this.ds.transaction(async (mgr: EntityManager) => {
      // Guard 1: If booking exists, check for existing sessions
      if (cmd.bookingId) {
        const existing = await mgr.findOneBy(SessionOrmEntity, {
          bookingId: cmd.bookingId,
        });
        if (existing && existing.status !== 'interrupted' && existing.status !== 'error') {
          throw new ConflictException(
            `Booking ${cmd.bookingId} already has session ${existing.id}`,
          );
        }
      }

      // Guard 2: Is the charger occupied?
      const activeSession = await mgr.findOne(SessionOrmEntity, {
        where: { chargerId: cmd.chargerId, status: 'active' },
      });
      if (activeSession) {
        throw new ConflictException(
          `Charger ${cmd.chargerId} is occupied by session ${activeSession.id}`,
        );
      }

      // Domain: Create session
      const session = ChargingSession.create({
        userId:       cmd.userId,
        chargerId:    cmd.chargerId,
        bookingId:    cmd.bookingId,
        startMeterWh: cmd.startMeterWh ?? 0,
        initiatedBy:  'user',
      });
      session.activate(); // pending -> active

      // Persist session - save depositAmount from booking for future billing
      await mgr.save(SessionOrmEntity, {
        id:                    session.id,
        userId:                session.userId,
        chargerId:             session.chargerId,
        bookingId:             session.bookingId,
        startMeterWh:          session.startMeterWh,
        status:                session.status,
        startTime:             session.startTime,
        endTime:               null,
        endMeterWh:            null,
        initiatedBy:           session.initiatedBy,
        errorReason:           null,
        depositAmount:         bookingDepositAmount,
        depositTransactionId:  bookingDepositTransactionId,
      });

      // Update charger state -> occupied
      await mgr.upsert(
        ChargerStateOrmEntity,
        {
          chargerId:       cmd.chargerId,
          availability:    'occupied',
          activeSessionId: session.id,
          errorCode:       null,
          updatedAt:       new Date(),
        },
        ['chargerId'],
      );

      // Outbox event
      const event = new SessionStartedEvent(
        session.id,
        session.userId,
        session.chargerId,
        session.bookingId,
        session.startTime,
        session.startMeterWh,
      );
      await mgr.save(OutboxOrmEntity, buildOutboxEntry(mgr, event, session.id));

      this.logger.log(
        `Session started by user ${cmd.userId}: ${session.id} ` +
        `charger=${cmd.chargerId} booking=${cmd.bookingId ?? 'walk-in'}`,
      );
      return session;
    });
  }
}



/**
 * Ends a session (completed or interrupted).
 *
 * Flow:
 * 1. Load session, assert active
 * 2. Domain: complete(endMeterWh) or interrupt(reason)
 * 3. Persist + outbox event (session.completed / session.interrupted)
 * 4. Release charger state -> available
 */
@Injectable()
export class StopSessionUseCase {
  private readonly logger = new Logger(StopSessionUseCase.name);

  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessionRepo: ISessionRepository,
    private readonly ds: DataSource,
  ) {}

  async execute(cmd: {
    sessionId: string;
    endMeterWh: number;
    reason?: string;   // If reason exists -> interrupted; otherwise -> completed
    energyFeeVnd?: number;   // Actual energy fee (VND)
    depositAmount?: number;  // Deposit amount from booking
    depositTransactionId?: string;
  }): Promise<ChargingSession> {
    return this.ds.transaction(async (mgr: EntityManager) => {
      const entity = await mgr.findOneBy(SessionOrmEntity, { id: cmd.sessionId });
      if (!entity) throw new NotFoundException(`Session ${cmd.sessionId} does not exist`);

      const session = this.entityToDomain(entity);

      let eventPayload: OutboxOrmEntity;

      if (cmd.reason) {
        session.interrupt(cmd.reason);
        const ev = new SessionInterruptedEvent(
          session.id, session.userId, session.chargerId, cmd.reason,
        );
        eventPayload = buildOutboxEntry(mgr, ev, session.id);
      } else {
        session.stop(cmd.endMeterWh, cmd.energyFeeVnd ?? 0);
        const durationMs = session.endTime!.getTime() - session.startTime.getTime();
        const ev = new SessionCompletedEvent(
          session.id,
          session.userId,
          session.chargerId,
          session.bookingId,
          session.kwhConsumed!,
          session.endTime!,
          Math.round(durationMs / 60000),
          cmd.energyFeeVnd ?? 0,
          session.idleFeeVnd,
          cmd.depositAmount ?? 0,
          cmd.depositTransactionId ?? null,
        );
        eventPayload = buildOutboxEntry(mgr, ev, session.id);
      }

      // Persist
      await mgr.update(SessionOrmEntity, cmd.sessionId, {
        status:      session.status,
        endTime:     session.endTime,
        endMeterWh:  session.endMeterWh,
        errorReason: session.errorReason,
      });

      // Release charger
      await mgr.upsert(
        ChargerStateOrmEntity,
        {
          chargerId:       session.chargerId,
          availability:    'available',
          activeSessionId: null,
          errorCode:       null,
          updatedAt:       new Date(),
        },
        ['chargerId'],
      );

      await mgr.save(OutboxOrmEntity, eventPayload);

      this.logger.log(
        `Session ${cmd.sessionId} -> ${session.status} kWh=${session.kwhConsumed ?? 'N/A'}`,
      );
      return session;
    });
  }

  private entityToDomain(e: SessionOrmEntity): ChargingSession {
    return ChargingSession.reconstitute({
      id:           e.id,
      userId:       e.userId,
      chargerId:    e.chargerId,
      bookingId:    e.bookingId,
      initiatedBy:  (e.initiatedBy ?? 'user') as any,
      startMeterWh: Number(e.startMeterWh),
      status:       e.status as any,
      startTime:    e.startTime,
      endTime:      e.endTime,
      endMeterWh:   e.endMeterWh !== null ? Number(e.endMeterWh) : null,
      errorReason:  e.errorReason,
      createdAt:    e.createdAt,
      updatedAt:    e.createdAt,
    });
  }
}



/**
 * Saves telemetry reading. Batch-friendly: Fire-and-forget.
 *
 * Validates via TelemetryReading value object.
 * Emits session.telemetry event into outbox for the realtime gateway to consume.
 */
@Injectable()
export class RecordTelemetryUseCase {
  private readonly logger = new Logger(RecordTelemetryUseCase.name);

  constructor(
    @InjectRepository(TelemetryOrmEntity)
    private readonly telemetryRepo: Repository<TelemetryOrmEntity>,
    @InjectRepository(OutboxOrmEntity)
    private readonly outboxRepo: Repository<OutboxOrmEntity>,
    @InjectRepository(SessionOrmEntity)
    private readonly sessionRepo: Repository<SessionOrmEntity>,
  ) {}

  async execute(sessionId: string, data: {
    powerKw?:      number;
    meterWh?:      number;
    socPercent?:   number;
    temperatureC?: number;
    errorCode?:    string;
    voltage?:      number;
    currentA?:     number;
  }): Promise<TelemetryOrmEntity> {
    // Validate via VO
    const reading = new TelemetryReading(data);

    // Persist telemetry
    const entry = this.telemetryRepo.create({
      id:           uuidv4(),
      sessionId,
      powerKw:      reading.powerKw,
      meterWh:      reading.meterWh,
      socPercent:   reading.socPercent,
      temperatureC: reading.temperatureC,
      errorCode:    reading.errorCode,
    });
    await this.telemetryRepo.save(entry);

    // Get chargerId to build event (needed for realtime routing)
    const session = await this.sessionRepo.findOneBy({ id: sessionId });

    // Emit telemetry event (realtime gateway picks this up via outbox publisher)
    const event = new SessionTelemetryEvent(
      sessionId,
      session?.chargerId ?? 'unknown',
      reading.powerKw,
      reading.meterWh,
      reading.socPercent,
      reading.recordedAt,
    );
    await this.outboxRepo.save(
      this.outboxRepo.create({
        id:            uuidv4(),
        aggregateType: 'session',
        aggregateId:   sessionId,
        eventType:     event.eventType,
        payload:       { ...event } as object,
        status:        'pending',
        publishedAt:   null,
      }),
    );

    return entry;
  }
}



@Injectable()
export class GetSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepo: ISessionRepository,
  ) {}

  async execute(sessionId: string): Promise<ChargingSession | null> {
    return this.sessionRepo.findById(sessionId);
  }

  async getActiveByCharger(chargerId: string): Promise<ChargingSession | null> {
    return this.sessionRepo.findActiveByCharger(chargerId);
  }

  async getUserHistory(userId: string, limit = 20): Promise<ChargingSession[]> {
    return this.sessionRepo.findByUserId(userId, limit);
  }
}



/**
 * Listens for booking.confirmed:
 *  -> Updates charger state -> reserved
 *  -> Idempotent
 */
@Injectable()
export class BookingConfirmedConsumer {
  private readonly logger = new Logger(BookingConfirmedConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    @InjectRepository(ChargerStateOrmEntity)
    private readonly chargerStateRepo: Repository<ChargerStateOrmEntity>,
  ) {}

  @RabbitSubscribe({
    exchange: 'ev.charging',
    routingKey: 'booking.confirmed',
    queue: 'charging-ctrl.booking.confirmed',
    queueOptions: { durable: true },
  })
  async handle(payload: {
    eventId: string;
    bookingId: string;
    chargerId: string;
    userId: string;
    startTime?: string;
  }): Promise<void> {
    const eventId = payload.eventId ?? `booking.confirmed:${payload.bookingId}`;
    const exists = await this.peRepo.existsBy({ eventId });
    if (exists) {
      this.logger.debug(`Duplicate event ${eventId}, skipping`);
      return;
    }

    await this.peRepo.save({ eventId, eventType: 'booking.confirmed' });

    // Reserve charger (available -> reserved)
    await this.chargerStateRepo.upsert(
      {
        chargerId:       payload.chargerId,
        availability:    'reserved',
        activeSessionId: null,
        errorCode:       null,
        updatedAt:       new Date(),
      },
      ['chargerId'],
    );

    this.logger.log(
      `Booking confirmed: charger ${payload.chargerId} -> reserved for booking ${payload.bookingId}`,
    );
  }
}



/**
 * Listens for payment.completed:
 *  -> Records successful payment (logging/analytics hook)
 *  -> Idempotent
 *
 * Note: Session is usually started separately via /charging/start.
 * This consumer only triggers if auto-start after payment is required (alternative flow).
 */
@Injectable()
export class PaymentCompletedConsumer {
  private readonly logger = new Logger(PaymentCompletedConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly peRepo: Repository<ProcessedEventOrmEntity>,
    @InjectRepository(SessionOrmEntity)
    private readonly sessionRepo: Repository<SessionOrmEntity>,
    @InjectRepository(OutboxOrmEntity)
    private readonly outboxRepo: Repository<OutboxOrmEntity>,
    @Inject(SESSION_REPOSITORY) private readonly sessionDomainRepo: ISessionRepository,
  ) {}

  @RabbitSubscribe({
    exchange: 'ev.charging',
    routingKey: 'payment.completed',
    queue: 'charging-ctrl.payment.completed',
    queueOptions: { durable: true },
  })
  async handle(payload: {
    eventId?: string;
    transactionId: string;
    userId: string;
    relatedId?: string;       // bookingId
    relatedType?: string;
    amount: number;
  }): Promise<void> {
    if (payload.relatedType !== 'booking' && payload.relatedType !== 'charging_session') return;

    const eventId = payload.eventId ?? `payment.completed:${payload.transactionId}`;
    const exists  = await this.peRepo.existsBy({ eventId });
    if (exists) { return; }

    await this.peRepo.save({ eventId, eventType: 'payment.completed' });

    // Lookup session via bookingId or sessionId
    let session = payload.relatedType === 'charging_session'
      ? await this.sessionDomainRepo.findById(payload.relatedId!)
      : await this.sessionDomainRepo.findByBookingId(payload.relatedId!);

    if (!session) {
      this.logger.warn(`No session found for payment ${payload.transactionId} relatedId=${payload.relatedId}`);
      return;
    }

    // STOPPED -> BILLED transition
    if (session.status !== 'stopped') {
      this.logger.debug(`Session ${session.id} is ${session.status}, skipping bill transition`);
      return;
    }

    session.bill();

    await this.sessionRepo.update(session.id, {
      status: session.status,
    });

    this.logger.log(`Session ${session.id} -> BILLED (payment ${payload.transactionId})`);
  }
}


import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  IQueueRepository,
  QUEUE_REPOSITORY,
} from '../../domain/repositories/queue.repository.interface';
import {
  IChargerRepository,
  CHARGER_REPOSITORY,
} from '../../domain/repositories/charger.repository.interface';
import { PriorityQueueService } from '../../domain/services/priority-queue.service';
import { CreateBookingUseCase } from './create-booking.use-case';
import { JoinQueueCommand, LeaveQueueCommand } from '../commands/booking.commands';
import { QueuePositionResponseDto } from '../dtos/response.dto';
import { IEventBus, EVENT_BUS } from '../../infrastructure/messaging/event-bus.interface';

@Injectable()
export class JoinQueueUseCase {
  private readonly logger = new Logger(JoinQueueUseCase.name);

  constructor(
    @Inject(QUEUE_REPOSITORY) private readonly queueRepo: IQueueRepository,
    private readonly priorityQueue: PriorityQueueService,
    private readonly dataSource: DataSource,
  ) {}

  async execute(cmd: JoinQueueCommand): Promise<QueuePositionResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const entry = await this.queueRepo.enqueue(
        {
          userId: cmd.userId,
          chargerId: cmd.chargerId,
          connectorType: cmd.connectorType,
          requestedAt: new Date(),
          userPriority: cmd.userPriority,
          urgencyScore: cmd.urgencyScore,
          status: 'waiting',
        },
        manager,
      );

      // Mirror into in-memory heap
      this.priorityQueue.enqueue(entry);

      const position = this.priorityQueue.getPosition(cmd.userId, cmd.chargerId);
      const estimatedWaitMinutes = position * 45; // avg 45min/session

      this.logger.log(`User ${cmd.userId} joined queue for ${cmd.chargerId} at position ${position}`);
      return { position, userId: cmd.userId, chargerId: cmd.chargerId, estimatedWaitMinutes };
    });
  }
}

@Injectable()
export class LeaveQueueUseCase {
  constructor(
    @Inject(QUEUE_REPOSITORY) private readonly queueRepo: IQueueRepository,
    private readonly priorityQueue: PriorityQueueService,
  ) {}

  async execute(cmd: LeaveQueueCommand): Promise<void> {
    await this.queueRepo.cancel(cmd.userId, cmd.chargerId);
    this.priorityQueue.removeByUser(cmd.userId, cmd.chargerId);
  }
}

/**
 * ProcessQueueUseCase — triggered when a charger slot becomes available
 * (via booking.cancelled or booking.completed event consumer)
 */
@Injectable()
export class ProcessQueueUseCase {
  private readonly logger = new Logger(ProcessQueueUseCase.name);

  constructor(
    private readonly priorityQueue: PriorityQueueService,
    @Inject(CHARGER_REPOSITORY) private readonly chargerRepo: IChargerRepository,
    private readonly createBooking: CreateBookingUseCase,
  ) {}

  async execute(chargerId: string): Promise<void> {
    const available = await this.chargerRepo.isAvailable(chargerId);
    if (!available) return;

    const next = this.priorityQueue.dequeueForCharger(chargerId);
    if (!next) {
      this.logger.debug(`Queue empty for charger ${chargerId}`);
      return;
    }

    try {
      // Lấy charger info để có stationId (cần cho PricingHttpClient)
      const charger = await this.chargerRepo.findById(chargerId);
      if (!charger) {
        this.logger.warn(`Charger ${chargerId} not found in read-model`);
        return;
      }

      await this.createBooking.execute({
        userId:        next.userId,
        chargerId,
        stationId:     charger.stationId,
        connectorType: next.connectorType ?? charger.connectorType,
        startTime:     new Date(),
        endTime:       new Date(Date.now() + 60 * 60 * 1000), // 1h slot
      });
      this.logger.log(`Auto-assigned charger ${chargerId} to user ${next.userId} from queue`);
    } catch (err) {
      // Re-enqueue on failure
      this.priorityQueue.enqueue(next);
      this.logger.warn(`Auto-assign failed for ${chargerId}, re-queued user ${next.userId}`);
    }
  }
}

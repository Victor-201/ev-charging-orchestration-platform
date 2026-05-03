import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessedEventOrmEntity } from '../../persistence/typeorm/entities/payment.orm-entities';
import { CreatePaymentUseCase } from '../../../application/use-cases/payment.use-cases';

/**
 * BookingConfirmedConsumer
 *
 * Lắng nghe event booking.confirmed → tự động tạo payment intent (transaction pending).
 * Idempotent: dựa vào processed_events để ngăn double-processing.
 *
 * Lưu ý: KHÔNG tạo payment URL ở đây — user phải gọi POST /payments/create
 * với bookingId để lấy VNPay URL. Consumer chỉ pre-create transaction record.
 */
@Injectable()
export class BookingConfirmedConsumer {
  private readonly logger = new Logger(BookingConfirmedConsumer.name);

  constructor(
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly processedRepo: Repository<ProcessedEventOrmEntity>,
  ) {}

  @RabbitSubscribe({
    exchange: 'ev.charging',
    routingKey: 'booking.confirmed',
    queue: 'payment-svc.booking.confirmed',
    queueOptions: { durable: true },
  })
  async handle(payload: {
    eventId: string;
    bookingId: string;
    userId: string;
    chargerId: string;
    startTime: string;
    endTime: string;
  }): Promise<void> {
    const eventId = payload.eventId ?? `booking.confirmed:${payload.bookingId}`;

    // ── Idempotency guard ─────────────────────────────────────────────────────
    const exists = await this.processedRepo.existsBy({ eventId });
    if (exists) {
      this.logger.debug(`Duplicate booking.confirmed event ${eventId}, skipping`);
      return;
    }

    await this.processedRepo.save({
      eventId,
      eventType: 'booking.confirmed',
    });

    /*
     * Payment intent sẽ được tạo khi user gọi POST /payments/create.
     * Consumer này chỉ đánh dấu booking đã được acknowledge, đảm bảo
     * idempotency nếu event được gửi nhiều lần.
     *
     * Nếu muốn auto-debit wallet (subscription user), thêm logic ở đây.
     */
    this.logger.log(
      `Booking confirmed received: bookingId=${payload.bookingId} userId=${payload.userId} — payment pending user action`,
    );
  }
}

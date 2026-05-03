import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import {
  NotificationOrmEntity,
  DeviceOrmEntity,
  NotificationPreferenceOrmEntity,
  ProcessedEventOrmEntity,
} from '../../infrastructure/persistence/typeorm/entities/notification.orm-entities';
import { Device, DevicePlatform } from '../../domain/entities/notification.aggregate';

// Re-exports cho AppModule
export { NotificationOrmEntity, ProcessedEventOrmEntity, DeviceOrmEntity, NotificationPreferenceOrmEntity };

// ─── GetNotificationsUseCase ──────────────────────────────────────────────────

/**
 * GET /notifications?limit=&unreadOnly=true
 * GET /notifications/unread
 */
@Injectable()
export class GetNotificationsUseCase {
  constructor(
    @InjectRepository(NotificationOrmEntity)
    private readonly repo: Repository<NotificationOrmEntity>,
  ) {}

  async execute(userId: string, limit = 20, unreadOnly = false): Promise<{
    items:       NotificationOrmEntity[];
    unreadCount: number;
  }> {
    const qb = this.repo.createQueryBuilder('n')
      .where('n.user_id = :uid', { uid: userId })
      .orderBy('n.created_at', 'DESC')
      .take(limit);

    if (unreadOnly) qb.andWhere('n.read_at IS NULL');

    const [items, unreadCount] = await Promise.all([
      qb.getMany(),
      this.repo.count({ where: { userId } }),  // total unread count
    ]);

    return { items, unreadCount };
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    const notif = await this.repo.findOneBy({ id: notificationId, userId });
    if (!notif) throw new NotFoundException('Notification not found');
    await this.repo.update({ id: notificationId, userId }, { readAt: new Date(), status: 'read' });
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.repo
      .createQueryBuilder()
      .update(NotificationOrmEntity)
      .set({ readAt: new Date(), status: 'read' })
      .where('user_id = :uid AND read_at IS NULL', { uid: userId })
      .execute();
    return { updated: result.affected ?? 0 };
  }
}

// ─── DeviceManagementUseCase ──────────────────────────────────────────────────

/**
 * POST /devices/register
 * DELETE /devices/:id
 * GET /devices (list user devices)
 */
@Injectable()
export class DeviceManagementUseCase {
  private readonly logger = new Logger(DeviceManagementUseCase.name);

  constructor(
    @InjectRepository(DeviceOrmEntity)
    private readonly repo: Repository<DeviceOrmEntity>,
  ) {}

  /**
   * Đăng ký device mới hoặc cập nhật token nếu device đã tồn tại.
   * Upsert by pushToken: nếu token đã có → update userId/lastActiveAt.
   */
  async register(params: {
    userId:     string;
    platform:   DevicePlatform;
    pushToken:  string;
    deviceName?: string;
  }): Promise<DeviceOrmEntity> {
    // Upsert by pushToken — token rotation (old token → new token)
    const existing = await this.repo.findOneBy({ pushToken: params.pushToken });

    if (existing) {
      // Token đã registered — update userId và refresh
      await this.repo.update(
        { pushToken: params.pushToken },
        { userId: params.userId, lastActiveAt: new Date(), deviceName: params.deviceName ?? existing.deviceName },
      );
      const updated = await this.repo.findOneBy({ pushToken: params.pushToken });
      this.logger.log(`Device re-registered: token=...${params.pushToken.slice(-8)} user=${params.userId}`);
      return updated!;
    }

    // New device registration
    const device = Device.register(params);
    const row = this.repo.create({
      id:           device.id,
      userId:       device.userId,
      platform:     device.platform,
      pushToken:    device.pushToken,
      deviceName:   device.deviceName,
      lastActiveAt: device.lastActiveAt,
    });
    await this.repo.save(row);
    this.logger.log(`Device registered: id=${device.id} user=${params.userId} platform=${params.platform}`);
    return row;
  }

  /** Xóa device (user logout hoặc revoke push) */
  async unregister(deviceId: string, userId: string): Promise<void> {
    const device = await this.repo.findOneBy({ id: deviceId, userId });
    if (!device) throw new NotFoundException(`Device ${deviceId} not found`);
    await this.repo.delete({ id: deviceId });
    this.logger.log(`Device unregistered: id=${deviceId} user=${userId}`);
  }

  /** Lấy tất cả devices của user */
  async listForUser(userId: string): Promise<DeviceOrmEntity[]> {
    return this.repo.find({
      where: { userId },
      order: { lastActiveAt: 'DESC' },
    });
  }
}

// ─── NotificationPreferenceUseCase ───────────────────────────────────────────

/**
 * GET /preferences
 * PATCH /preferences
 */
@Injectable()
export class NotificationPreferenceUseCase {
  constructor(
    @InjectRepository(NotificationPreferenceOrmEntity)
    private readonly repo: Repository<NotificationPreferenceOrmEntity>,
  ) {}

  async getOrCreate(userId: string): Promise<NotificationPreferenceOrmEntity> {
    const existing = await this.repo.findOneBy({ userId });
    if (existing) return existing;

    // Auto-create với defaults
    const row = this.repo.create({
      userId,
      enablePush:      true,
      enableRealtime:  true,
      enableEmail:     true,
      enableSms:       false,
      quietHoursStart: null,
      quietHoursEnd:   null,
    });
    return this.repo.save(row);
  }

  async update(userId: string, update: {
    enablePush?:      boolean;
    enableRealtime?:  boolean;
    enableEmail?:     boolean;
    enableSms?:       boolean;
    quietHoursStart?: number | null;
    quietHoursEnd?:   number | null;
  }): Promise<NotificationPreferenceOrmEntity> {
    await this.repo.upsert({ userId, ...update }, ['userId']);
    return this.getOrCreate(userId);
  }
}

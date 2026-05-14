/**
 * Tests: DeliveryEngine - multi-channel dispatch logic
 *
 * Mock all dependencies. Test:
 * - Notification is persisted before dispatch
 * - Realtime emitted when enableRealtime = true
 * - Push sent when enablePush = true and not in quiet hours
 * - Email stub when enableEmail = true
 * - Preference defaults applied when user does not have a preference row
 */
import { DeliveryEngine } from '../../src/domain/services/delivery.engine';
import { NotificationPreference } from '../../src/domain/entities/notification.aggregate';

import { Logger } from '@nestjs/common';

// Mock Factories

function makeDeliveryEngine(overrides?: {
  prefRow?:  any | null;    // null = no preference row (use defaults)
  fcmResult?: { sent: number; failed: number };
}) {
  const notifRepo = {
    create: jest.fn((d: any) => d),
    save:   jest.fn().mockResolvedValue(undefined),
  };

  const prefRow = overrides?.prefRow !== undefined
    ? overrides.prefRow
    : {
        userId:          'user-001',
        enablePush:      true,
        enableRealtime:  true,
        enableEmail:     true,
        enableSms:       false,
        quietHoursStart: null,
        quietHoursEnd:   null,
        updatedAt:       new Date(),
      };

  const prefRepo = {
    findOneBy: jest.fn().mockResolvedValue(prefRow),
  };

  const gateway = {
    emitToUser:       jest.fn(),
    emitBookingUpdate:  jest.fn(),
    emitQueueUpdate:    jest.fn(),
    emitChargingUpdate: jest.fn(),
  };

  const fcm = {
    sendToUser: jest.fn().mockResolvedValue(
      overrides?.fcmResult ?? { sent: 2, failed: 0, tokens: ['tok1', 'tok2'] },
    ),
  };

  const config = {
    get: jest.fn().mockImplementation((key: string, def: any) => {
      if (key === 'SMTP_PORT') return 587;
      return def;
    }),
  };

  const engine = new DeliveryEngine(
    notifRepo as any,
    prefRepo  as any,
    gateway   as any,
    fcm       as any,
    config    as any,
  );

  return { engine, notifRepo, prefRepo, gateway, fcm };
}

// Tests

describe('DeliveryEngine.dispatch', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const baseParams = {
    userId:   'user-001',
    type:     'booking.confirmed' as const,
    channels: ['in_app', 'push'] as any,
    title:    'Lịch sạc được xác nhận',
    body:     'Lịch của bạn đã được xác nhận!',
  };

  // Persist

  it('persist notification before dispatch', async () => {
    const { engine, notifRepo } = makeDeliveryEngine();
    await engine.dispatch(baseParams);

    expect(notifRepo.save).toHaveBeenCalledTimes(1);
    const saved = notifRepo.create.mock.calls[0][0];
    expect(saved.userId).toBe('user-001');
    expect(saved.type).toBe('booking.confirmed');
    expect(saved.title).toBe('Lịch sạc được xác nhận');
    expect(saved.status).toBe('sent');
  });

  it('notification has a generated ID', async () => {
    const { engine } = makeDeliveryEngine();
    const notif = await engine.dispatch(baseParams);
    expect(notif.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  // Realtime

  it('emitToUser when enableRealtime = true and channel = in_app', async () => {
    const { engine, gateway } = makeDeliveryEngine();
    await engine.dispatch(baseParams);
    expect(gateway.emitToUser).toHaveBeenCalledTimes(1);
    const [userId, payload] = gateway.emitToUser.mock.calls[0];
    expect(userId).toBe('user-001');
    expect(payload.type).toBe('booking.confirmed');
  });

  it('emitToUser is NOT called when enableRealtime = false', async () => {
    const { engine, gateway } = makeDeliveryEngine({
      prefRow: { userId: 'user-001', enableRealtime: false, enablePush: true, enableEmail: true,
                 enableSms: false, quietHoursStart: null, quietHoursEnd: null, updatedAt: new Date() },
    });
    await engine.dispatch(baseParams);
    expect(gateway.emitToUser).not.toHaveBeenCalled();
  });

  it('emitBookingUpdate when realtimePayload.bookingUpdate is present', async () => {
    const { engine, gateway } = makeDeliveryEngine();
    await engine.dispatch({
      ...baseParams,
      realtimePayload: { bookingUpdate: { bookingId: 'b-001', status: 'confirmed', message: 'OK' } },
    });
    expect(gateway.emitBookingUpdate).toHaveBeenCalledTimes(1);
    const [userId, bupdate] = gateway.emitBookingUpdate.mock.calls[0];
    expect(userId).toBe('user-001');
    expect((bupdate as any).bookingId).toBe('b-001');
    expect((bupdate as any).status).toBe('confirmed');
  });

  it('emitQueueUpdate when realtimePayload.queueUpdate is present', async () => {
    const { engine, gateway } = makeDeliveryEngine();
    await engine.dispatch({
      ...baseParams,
      channels: ['in_app'] as any,
      realtimePayload: { queueUpdate: { queueId: 'q-001', position: 3, estimatedWaitMinutes: 15, status: 'waiting', chargerId: 'ch-1' } },
    });
    expect(gateway.emitQueueUpdate).toHaveBeenCalledTimes(1);
  });

  it('emitChargingUpdate when realtimePayload.chargingUpdate is present', async () => {
    const { engine, gateway } = makeDeliveryEngine();
    await engine.dispatch({
      ...baseParams,
      channels: ['push', 'in_app'] as any,
      realtimePayload: { chargingUpdate: { sessionId: 's-001', eventType: 'session.started', message: 'Started' } },
    });
    expect(gateway.emitChargingUpdate).toHaveBeenCalledTimes(1);
  });

  // Push FCM

  it('sendToUser FCM when channel = push and enablePush = true', async () => {
    const { engine, fcm } = makeDeliveryEngine();
    await engine.dispatch(baseParams);
    expect(fcm.sendToUser).toHaveBeenCalledTimes(1);
    const call = fcm.sendToUser.mock.calls[0][0];
    expect(call.userId).toBe('user-001');
    expect(call.title).toBe('Lịch sạc được xác nhận');
  });

  it('does NOT send push when enablePush = false', async () => {
    const { engine, fcm } = makeDeliveryEngine({
      prefRow: { userId: 'user-001', enablePush: false, enableRealtime: true, enableEmail: true,
                 enableSms: false, quietHoursStart: null, quietHoursEnd: null, updatedAt: new Date() },
    });
    await engine.dispatch(baseParams);
    expect(fcm.sendToUser).not.toHaveBeenCalled();
  });

  it('does NOT send push during quiet hours (all-day quiet)', async () => {
    const { engine, fcm } = makeDeliveryEngine({
      prefRow: { userId: 'user-001', enablePush: true, enableRealtime: true, enableEmail: true,
                 enableSms: false, quietHoursStart: 0, quietHoursEnd: 23, updatedAt: new Date() },
    });
    await engine.dispatch(baseParams);
    // 0-23 covers all 24 hours -> canSendPushNow = false
    expect(fcm.sendToUser).not.toHaveBeenCalled();
  });

  // Default preferences

  it('uses default preferences when user has no preference row', async () => {
    const { engine, gateway, fcm } = makeDeliveryEngine({ prefRow: null });
    await engine.dispatch(baseParams);
    // Default: enableRealtime=true, enablePush=true -> both are fired
    expect(gateway.emitToUser).toHaveBeenCalledTimes(1);
    expect(fcm.sendToUser).toHaveBeenCalledTimes(1);
  });

  // Return value

  it('returns Notification object with correct properties', async () => {
    const { engine } = makeDeliveryEngine();
    const notif = await engine.dispatch(baseParams);
    expect(notif.userId).toBe('user-001');
    expect(notif.type).toBe('booking.confirmed');
    expect(notif.title).toBe('Lịch sạc được xác nhận');
    expect(notif.createdAt).toBeInstanceOf(Date);
  });
});

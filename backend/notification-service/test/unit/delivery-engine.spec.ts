/**
 * Tests: DeliveryEngine — multi-channel dispatch logic
 *
 * Mock tất cả dependencies. Test:
 * - Notification được persist trước khi dispatch
 * - Realtime emitted khi enableRealtime = true
 * - Push sent khi enablePush = true và không trong quiet hours
 * - Email stub khi enableEmail = true
 * - Preference defaults áp dụng khi user chưa có preference row
 */
import { DeliveryEngine } from '../../src/domain/services/delivery.engine';
import { NotificationPreference } from '../../src/domain/entities/notification.aggregate';

// ─── Mock Factories ───────────────────────────────────────────────────────────

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

  const engine = new DeliveryEngine(
    notifRepo as any,
    prefRepo as any,
    gateway  as any,
    fcm      as any,
  );

  return { engine, notifRepo, prefRepo, gateway, fcm };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DeliveryEngine.dispatch', () => {

  const baseParams = {
    userId:   'user-001',
    type:     'booking.confirmed' as const,
    channels: ['in_app', 'push'] as any,
    title:    'Lịch sạc được xác nhận',
    body:     'Lịch của bạn đã được xác nhận!',
  };

  // ── Persist ─────────────────────────────────────────────────────────────────

  it('persist notification trước khi dispatch', async () => {
    const { engine, notifRepo } = makeDeliveryEngine();
    await engine.dispatch(baseParams);

    expect(notifRepo.save).toHaveBeenCalledTimes(1);
    const saved = notifRepo.create.mock.calls[0][0];
    expect(saved.userId).toBe('user-001');
    expect(saved.type).toBe('booking.confirmed');
    expect(saved.title).toBe('Lịch sạc được xác nhận');
    expect(saved.status).toBe('sent');
  });

  it('notification có ID được generate', async () => {
    const { engine } = makeDeliveryEngine();
    const notif = await engine.dispatch(baseParams);
    expect(notif.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  // ── Realtime ─────────────────────────────────────────────────────────────────

  it('emitToUser khi enableRealtime = true và channel = in_app', async () => {
    const { engine, gateway } = makeDeliveryEngine();
    await engine.dispatch(baseParams);
    expect(gateway.emitToUser).toHaveBeenCalledTimes(1);
    const [userId, payload] = gateway.emitToUser.mock.calls[0];
    expect(userId).toBe('user-001');
    expect(payload.type).toBe('booking.confirmed');
  });

  it('emitToUser KHÔNG gọi khi enableRealtime = false', async () => {
    const { engine, gateway } = makeDeliveryEngine({
      prefRow: { userId: 'user-001', enableRealtime: false, enablePush: true, enableEmail: true,
                 enableSms: false, quietHoursStart: null, quietHoursEnd: null, updatedAt: new Date() },
    });
    await engine.dispatch(baseParams);
    expect(gateway.emitToUser).not.toHaveBeenCalled();
  });

  it('emitBookingUpdate khi có realtimePayload.bookingUpdate', async () => {
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

  it('emitQueueUpdate khi có realtimePayload.queueUpdate', async () => {
    const { engine, gateway } = makeDeliveryEngine();
    await engine.dispatch({
      ...baseParams,
      channels: ['in_app'] as any,
      realtimePayload: { queueUpdate: { queueId: 'q-001', position: 3, estimatedWaitMinutes: 15, status: 'waiting', chargerId: 'ch-1' } },
    });
    expect(gateway.emitQueueUpdate).toHaveBeenCalledTimes(1);
  });

  it('emitChargingUpdate khi có realtimePayload.chargingUpdate', async () => {
    const { engine, gateway } = makeDeliveryEngine();
    await engine.dispatch({
      ...baseParams,
      channels: ['push', 'in_app'] as any,
      realtimePayload: { chargingUpdate: { sessionId: 's-001', eventType: 'session.started', message: 'Started' } },
    });
    expect(gateway.emitChargingUpdate).toHaveBeenCalledTimes(1);
  });

  // ── Push FCM ─────────────────────────────────────────────────────────────────

  it('sendToUser FCM khi channel = push và enablePush = true', async () => {
    const { engine, fcm } = makeDeliveryEngine();
    await engine.dispatch(baseParams);
    expect(fcm.sendToUser).toHaveBeenCalledTimes(1);
    const call = fcm.sendToUser.mock.calls[0][0];
    expect(call.userId).toBe('user-001');
    expect(call.title).toBe('Lịch sạc được xác nhận');
  });

  it('KHÔNG gửi push khi enablePush = false', async () => {
    const { engine, fcm } = makeDeliveryEngine({
      prefRow: { userId: 'user-001', enablePush: false, enableRealtime: true, enableEmail: true,
                 enableSms: false, quietHoursStart: null, quietHoursEnd: null, updatedAt: new Date() },
    });
    await engine.dispatch(baseParams);
    expect(fcm.sendToUser).not.toHaveBeenCalled();
  });

  it('KHÔNG gửi push trong quiet hours (all-day quiet)', async () => {
    const { engine, fcm } = makeDeliveryEngine({
      prefRow: { userId: 'user-001', enablePush: true, enableRealtime: true, enableEmail: true,
                 enableSms: false, quietHoursStart: 0, quietHoursEnd: 23, updatedAt: new Date() },
    });
    await engine.dispatch(baseParams);
    // 0-23 covers all 24 hours → canSendPushNow = false
    expect(fcm.sendToUser).not.toHaveBeenCalled();
  });

  // ── Default preferences ────────────────────────────────────────────────────

  it('dùng default preferences khi user chưa có preference row', async () => {
    const { engine, gateway, fcm } = makeDeliveryEngine({ prefRow: null });
    await engine.dispatch(baseParams);
    // Default: enableRealtime=true, enablePush=true → cả hai đều fire
    expect(gateway.emitToUser).toHaveBeenCalledTimes(1);
    expect(fcm.sendToUser).toHaveBeenCalledTimes(1);
  });

  // ── Return value ───────────────────────────────────────────────────────────

  it('trả về Notification object với đúng properties', async () => {
    const { engine } = makeDeliveryEngine();
    const notif = await engine.dispatch(baseParams);
    expect(notif.userId).toBe('user-001');
    expect(notif.type).toBe('booking.confirmed');
    expect(notif.title).toBe('Lịch sạc được xác nhận');
    expect(notif.createdAt).toBeInstanceOf(Date);
  });
});

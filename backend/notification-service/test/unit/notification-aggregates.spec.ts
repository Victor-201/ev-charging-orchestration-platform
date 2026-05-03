/**
 * Tests: Notification Domain Aggregates
 *
 * Pure unit tests — không cần DB hay NestJS context.
 */
import {
  Notification, Device, NotificationPreference,
} from '../../src/domain/entities/notification.aggregate';

// ─── Notification Aggregate ───────────────────────────────────────────────────

describe('Notification Aggregate', () => {

  function makeNotif() {
    return Notification.create({
      userId:  'user-001',
      type:    'booking.confirmed',
      channel: 'push',
      title:   'Lịch sạc được xác nhận 🔋',
      body:    'Lịch sạc của bạn đã được xác nhận!',
    });
  }

  it('tạo notification với status pending', () => {
    const n = makeNotif();
    expect(n.status).toBe('pending');
    expect(n.readAt).toBeNull();
    expect(n.isRead).toBe(false);
    expect(n.id).toBeDefined();
  });

  it('markSent: pending → sent', () => {
    const n = makeNotif();
    n.markSent();
    expect(n.status).toBe('sent');
  });

  it('markRead: pending → read, readAt được set', () => {
    const n = makeNotif();
    n.markRead();
    expect(n.status).toBe('read');
    expect(n.readAt).not.toBeNull();
    expect(n.isRead).toBe(true);
  });

  it('markRead: idempotent — không thay đổi readAt nếu đã read', () => {
    const n = makeNotif();
    n.markRead();
    const firstReadAt = n.readAt;
    n.markRead();  // second call
    expect(n.readAt).toBe(firstReadAt);
  });

  it('markFailed: pending → failed', () => {
    const n = makeNotif();
    n.markFailed();
    expect(n.status).toBe('failed');
  });

  it('markFailed: không thể fail sau khi đã read', () => {
    const n = makeNotif();
    n.markRead();
    n.markFailed();
    expect(n.status).toBe('read');  // unchanged
  });

  it('throw khi không có userId', () => {
    expect(() => Notification.create({
      userId: '',  channel: 'push', type: 'booking.created',
      title: 'T', body: 'B',
    })).toThrow('userId required');
  });

  it('throw khi title rỗng', () => {
    expect(() => Notification.create({
      userId: 'u-001', channel: 'push', type: 'booking.created',
      title: '   ', body: 'B',
    })).toThrow('title required');
  });

  it('throw khi body rỗng', () => {
    expect(() => Notification.create({
      userId: 'u-001', channel: 'push', type: 'booking.created',
      title: 'T', body: '',
    })).toThrow('body required');
  });

  it('metadata mặc định là empty object', () => {
    const n = makeNotif();
    expect(n.metadata).toEqual({});
  });

  it('metadata được set khi truyền vào', () => {
    const n = Notification.create({
      userId: 'u-001', type: 'booking.created', channel: 'in_app',
      title: 'T', body: 'B', metadata: { bookingId: 'b-001' },
    });
    expect(n.metadata).toEqual({ bookingId: 'b-001' });
  });
});

// ─── Device Aggregate ─────────────────────────────────────────────────────────

describe('Device Aggregate', () => {

  it('register tạo device với đúng props', () => {
    const d = Device.register({
      userId:    'user-001',
      platform:  'android',
      pushToken: 'fcm-token-abc',
      deviceName: 'Samsung Galaxy',
    });
    expect(d.userId).toBe('user-001');
    expect(d.platform).toBe('android');
    expect(d.pushToken).toBe('fcm-token-abc');
    expect(d.deviceName).toBe('Samsung Galaxy');
    expect(d.id).toBeDefined();
    expect(d.lastActiveAt).toBeInstanceOf(Date);
  });

  it('register: deviceName optional (null nếu không truyền)', () => {
    const d = Device.register({ userId: 'u', platform: 'web', pushToken: 'tok-1' });
    expect(d.deviceName).toBeNull();
  });

  it('throw khi pushToken rỗng', () => {
    expect(() => Device.register({ userId: 'u', platform: 'ios', pushToken: '' }))
      .toThrow('pushToken (FCM token) required');
  });

  it('throw khi userId rỗng', () => {
    expect(() => Device.register({ userId: '', platform: 'ios', pushToken: 'tok' }))
      .toThrow('userId required');
  });

  it('updateToken: cập nhật token và lastActiveAt', async () => {
    const d = Device.register({ userId: 'u', platform: 'android', pushToken: 'old-token' });
    const before = d.lastActiveAt;

    await new Promise((r) => setTimeout(r, 5)); // ensure time passes
    d.updateToken('new-token');

    expect(d.pushToken).toBe('new-token');
    expect(d.lastActiveAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('updateToken: throw khi newToken rỗng', () => {
    const d = Device.register({ userId: 'u', platform: 'android', pushToken: 'tok' });
    expect(() => d.updateToken('')).toThrow('new pushToken required');
  });
});

// ─── NotificationPreference Aggregate ────────────────────────────────────────

describe('NotificationPreference Aggregate', () => {

  it('createDefault: tất cả enabled (trừ sms)', () => {
    const pref = NotificationPreference.createDefault('user-001');
    expect(pref.enablePush).toBe(true);
    expect(pref.enableRealtime).toBe(true);
    expect(pref.enableEmail).toBe(true);
    expect(pref.enableSms).toBe(false);
    expect(pref.quietHoursStart).toBeNull();
    expect(pref.quietHoursEnd).toBeNull();
  });

  it('canSendPushNow: true khi không có quiet hours', () => {
    const pref = NotificationPreference.createDefault('user-001');
    expect(pref.canSendPushNow()).toBe(true);
  });

  it('canSendPushNow: false khi enablePush = false', () => {
    const pref = NotificationPreference.createDefault('user-001');
    pref.updatePreferences({ enablePush: false });
    expect(pref.canSendPushNow()).toBe(false);
  });

  it('canSendPushNow: false trong quiet hours (UTC)', () => {
    const pref = NotificationPreference.reconstitute({
      userId: 'u', enablePush: true, enableRealtime: true,
      enableEmail: true, enableSms: false,
      quietHoursStart: 0, quietHoursEnd: 23,  // all day quiet
      updatedAt: new Date(),
    });
    // 0-23 covers all hours → always blocked
    expect(pref.canSendPushNow()).toBe(false);
  });

  it('canSendPushNow: true ngoài quiet hours range', () => {
    const pref = NotificationPreference.reconstitute({
      userId: 'u', enablePush: true, enableRealtime: true,
      enableEmail: true, enableSms: false,
      quietHoursStart: 2, quietHoursEnd: 2,  // start == end → no quiet
      updatedAt: new Date(),
    });
    // start <= end: quiet if hour in [2,2) → empty range → can send
    expect(pref.canSendPushNow()).toBe(true);
  });

  it('updatePreferences: update enableSms', () => {
    const pref = NotificationPreference.createDefault('user-001');
    pref.updatePreferences({ enableSms: true });
    expect(pref.enableSms).toBe(true);
  });

  it('throw khi userId rỗng', () => {
    expect(() => NotificationPreference.createDefault('')).toThrow('userId required');
  });
});

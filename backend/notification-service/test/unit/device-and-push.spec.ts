/**
 * Tests: Device registration + FCM multi-device logic
 *
 * Test DeviceManagementUseCase: register (new + upsert), unregister, list.
 * Test FcmPushService stub mode: sendToUser khi FCM không configured.
 */
import { DeviceManagementUseCase } from '../../src/application/use-cases/notification.use-cases';
import { FcmPushService } from '../../src/infrastructure/push/fcm-push.service';
import { NotFoundException } from '@nestjs/common';

// ─── DeviceManagementUseCase ──────────────────────────────────────────────────

describe('DeviceManagementUseCase', () => {

  function makeDeviceRepo(existingDevice?: any) {
    return {
      findOneBy: jest.fn().mockResolvedValue(existingDevice ?? null),
      find:      jest.fn().mockResolvedValue(existingDevice ? [existingDevice] : []),
      create:    jest.fn((d: any) => d),
      save:      jest.fn((d: any) => Promise.resolve(d)),
      update:    jest.fn().mockResolvedValue({ affected: 1 }),
      delete:    jest.fn().mockResolvedValue({ affected: 1 }),
    };
  }

  it('register new device: tạo bản ghi mới', async () => {
    const repo = makeDeviceRepo(null);  // no existing device
    const uc = new DeviceManagementUseCase(repo as any);

    await uc.register({
      userId: 'user-001', platform: 'android', pushToken: 'new-token-abc',
    });

    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = repo.create.mock.calls[0][0];
    expect(saved.userId).toBe('user-001');
    expect(saved.platform).toBe('android');
    expect(saved.pushToken).toBe('new-token-abc');
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('register existing token: upsert (không tạo mới)', async () => {
    const existingDevice = {
      id: 'existing-dev-id', userId: 'user-001', platform: 'android',
      pushToken: 'old-token', deviceName: null, lastActiveAt: new Date(),
    };
    const repo = makeDeviceRepo(existingDevice);
    // findOneBy returns existing on both calls
    repo.findOneBy
      .mockResolvedValueOnce(existingDevice)  // first: check existing
      .mockResolvedValueOnce(existingDevice); // second: after update

    const uc = new DeviceManagementUseCase(repo as any);
    const result = await uc.register({
      userId: 'user-002', platform: 'android', pushToken: 'old-token',  // same token, different user (transfer)
    });

    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(repo.save).not.toHaveBeenCalled();  // không tạo mới
  });

  it('unregister: xóa device', async () => {
    const existingDevice = { id: 'dev-001', userId: 'user-001', pushToken: 'tok' };
    const repo = makeDeviceRepo(existingDevice);
    const uc = new DeviceManagementUseCase(repo as any);

    await uc.unregister('dev-001', 'user-001');

    expect(repo.delete).toHaveBeenCalledWith({ id: 'dev-001' });
  });

  it('unregister: NotFoundException nếu device không tồn tại', async () => {
    const repo = makeDeviceRepo(null);  // not found
    const uc = new DeviceManagementUseCase(repo as any);

    await expect(uc.unregister('non-existent-id', 'user-001')).rejects.toThrow(NotFoundException);
  });

  it('listForUser: trả về tất cả devices của user', async () => {
    const devices = [
      { id: 'd1', userId: 'user-001', platform: 'android', pushToken: 't1' },
      { id: 'd2', userId: 'user-001', platform: 'ios',     pushToken: 't2' },
    ];
    const repo = {
      findOneBy: jest.fn(),
      find:      jest.fn().mockResolvedValue(devices),
      create:    jest.fn(),
      save:      jest.fn(),
      update:    jest.fn(),
      delete:    jest.fn(),
    };
    const uc = new DeviceManagementUseCase(repo as any);
    const result = await uc.listForUser('user-001');

    expect(repo.find).toHaveBeenCalledWith({
      where: { userId: 'user-001' },
      order: { lastActiveAt: 'DESC' },
    });
    expect(result).toHaveLength(2);
  });

  it('register: deviceName null khi không truyền', async () => {
    const repo = makeDeviceRepo(null);
    const uc = new DeviceManagementUseCase(repo as any);
    await uc.register({ userId: 'u', platform: 'web', pushToken: 'tok-web' });
    const saved = repo.create.mock.calls[0][0];
    expect(saved.deviceName).toBeNull();
  });

  it('register: deviceName được lưu khi truyền vào', async () => {
    const repo = makeDeviceRepo(null);
    const uc = new DeviceManagementUseCase(repo as any);
    await uc.register({ userId: 'u', platform: 'ios', pushToken: 'tok-ios', deviceName: 'iPhone 15' });
    const saved = repo.create.mock.calls[0][0];
    expect(saved.deviceName).toBe('iPhone 15');
  });
});

// ─── FcmPushService Stub Mode ─────────────────────────────────────────────────

describe('FcmPushService', () => {

  function makeFcmService(devices: any[]) {
    const deviceRepo = {
      find:   jest.fn().mockResolvedValue(devices),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    // Inject null as firebaseApp → triggers stub mode (no real FCM calls)
    const svc = new FcmPushService(null as any, deviceRepo as any);
    return { svc, deviceRepo };
  }

  it('sendToUser: trả về 0/0 khi user không có devices', async () => {
    const { svc } = makeFcmService([]);
    const result = await svc.sendToUser({ userId: 'user-001', title: 'T', body: 'B' });
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.tokens).toHaveLength(0);
  });

  it('sendToUser STUB MODE: success khi FCM không configured', async () => {
    const devices = [
      { pushToken: 'tok-android', userId: 'u1' },
      { pushToken: 'tok-ios',     userId: 'u1' },
    ];
    const { svc } = makeFcmService(devices);  // FCM not configured (null)
    const result = await svc.sendToUser({ userId: 'u1', title: 'Test', body: 'Message' });

    // Stub mode: all success
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.tokens).toHaveLength(2);
  });

  it('sendToUser: lookup devices by userId', async () => {
    const devices = [{ pushToken: 'tok-1', userId: 'user-002' }];
    const { svc, deviceRepo } = makeFcmService(devices);
    await svc.sendToUser({ userId: 'user-002', title: 'T', body: 'B' });

    expect(deviceRepo.find).toHaveBeenCalledWith({ where: { userId: 'user-002' } });
  });
});

// ─── Multi-device Scenario ────────────────────────────────────────────────────

describe('Multi-device fanout scenario', () => {
  it('user với 3 devices: tất cả nhận push (stub mode)', async () => {
    const devices = [
      { pushToken: 'phone-token',  platform: 'android' },
      { pushToken: 'tablet-token', platform: 'android' },
      { pushToken: 'web-token',    platform: 'web' },
    ];

    const deviceRepo = {
      find:   jest.fn().mockResolvedValue(devices),
      delete: jest.fn(),
    };
    // Pass null as firebaseApp → stub mode (no real Firebase calls)
    const svc = new FcmPushService(null as any, deviceRepo as any);

    const result = await svc.sendToUser({ userId: 'u', title: 'Charging Complete', body: '15kWh charged' });

    expect(result.tokens).toHaveLength(3);
    expect(result.sent).toBe(3);
    expect(result.tokens).toContain('phone-token');
    expect(result.tokens).toContain('tablet-token');
    expect(result.tokens).toContain('web-token');
  });
});

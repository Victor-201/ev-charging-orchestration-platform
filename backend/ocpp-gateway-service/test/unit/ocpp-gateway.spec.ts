/**
 * Tests: OcppGatewayService — State Management & Command Logic
 *
 * Pure unit tests — không cần WebSocket server thật, không cần RabbitMQ.
 * Test: connection registry, pendingCalls map, isConnected(), getConnectedChargers().
 */
import { OcppGatewayService } from '../../src/ocpp/ocpp-gateway.service';

// ─── Mock AmqpConnection ──────────────────────────────────────────────────────

function makeService() {
  const mockAmqp = {
    publish: jest.fn().mockResolvedValue(undefined),
  };
  const mockConfig = {
    get: jest.fn().mockImplementation((key: string, def?: any) => {
      if (key === 'OCPP_PORT') return 9000;
      if (key === 'OCPP_PATH') return '/ocpp';
      return def;
    }),
  };

  // OcppGatewayService cần AmqpConnection và ConfigService
  const svc = new OcppGatewayService(mockAmqp as any, mockConfig as any);
  return { svc, mockAmqp };
}

// ─── Mock WebSocket helper ─────────────────────────────────────────────────────

function makeSocket(readyState: number = 1 /* OPEN */) {
  return {
    readyState,
    send:  jest.fn(),
    close: jest.fn(),
    on:    jest.fn(),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OcppGatewayService', () => {

  describe('Connection Registry', () => {
    it('isConnected() → false cho charger chưa kết nối', () => {
      const { svc } = makeService();
      expect(svc.isConnected('charger-001')).toBe(false);
    });

    it('getConnectedChargers() → empty khi chưa có kết nối', () => {
      const { svc } = makeService();
      expect(svc.getConnectedChargers()).toHaveLength(0);
    });

    it('isConnected() → true sau khi registerCharger()', () => {
      const { svc } = makeService();
      const socket = makeSocket(1);  // readyState = OPEN

      // Inject charger trực tiếp vào internal map (test private state)
      (svc as any).chargers.set('charger-001', {
        chargerId: 'charger-001',
        socket,
        connectedAt: new Date(),
        ipAddress: '192.168.1.100',
      });

      expect(svc.isConnected('charger-001')).toBe(true);
    });

    it('isConnected() → false khi socket đã đóng (readyState = 3 CLOSED)', () => {
      const { svc } = makeService();
      const socket = makeSocket(3);  // CLOSED

      (svc as any).chargers.set('charger-002', {
        chargerId: 'charger-002',
        socket,
        connectedAt: new Date(),
        ipAddress: '192.168.1.101',
      });

      expect(svc.isConnected('charger-002')).toBe(false);
    });

    it('getConnectedChargers() trả về tất cả kết nối hiện tại', () => {
      const { svc } = makeService();
      const s1 = makeSocket(1);
      const s2 = makeSocket(1);

      (svc as any).chargers.set('c-001', { chargerId: 'c-001', socket: s1, connectedAt: new Date(), ipAddress: '1.1.1.1' });
      (svc as any).chargers.set('c-002', { chargerId: 'c-002', socket: s2, connectedAt: new Date(), ipAddress: '1.1.1.2' });

      const conns = svc.getConnectedChargers();
      expect(conns).toHaveLength(2);
      expect(conns.map((c: any) => c.chargerId)).toContain('c-001');
      expect(conns.map((c: any) => c.chargerId)).toContain('c-002');
    });
  });

  describe('RemoteStartTransaction', () => {
    it('trả về false sau timeout nếu charger không connected', async () => {
      const { svc } = makeService();

      // Charger không có trong registry → timeout ngay
      // Override timeout để test không bị chậm (mock internal)
      jest.useFakeTimers();
      const promise = svc.remoteStartTransaction('charger-999', {
        connectorId: 1,
        idTag: 'RFID-TEST',
      });
      jest.advanceTimersByTime(31_000);
      const result = await promise;
      jest.useRealTimers();

      expect(result).toBe(false);
    }, 10_000);

    it('trả về false sau timeout nếu charger socket đã đóng', async () => {
      const { svc } = makeService();
      const closedSocket = makeSocket(3);  // CLOSED

      (svc as any).chargers.set('charger-offline', {
        chargerId: 'charger-offline',
        socket: closedSocket,
        connectedAt: new Date(),
        ipAddress: '192.168.1.200',
      });

      jest.useFakeTimers();
      const promise = svc.remoteStartTransaction('charger-offline', {
        connectorId: 1,
        idTag: 'RFID-123',
      });
      jest.advanceTimersByTime(31_000);
      const result = await promise;
      jest.useRealTimers();

      expect(result).toBe(false);
    }, 10_000);

    it('resolves true khi charger reply Accepted trong pendingCalls', async () => {
      const { svc } = makeService();
      const socket = makeSocket(1);

      (svc as any).chargers.set('charger-live', {
        chargerId: 'charger-live',
        socket,
        connectedAt: new Date(),
        ipAddress: '10.0.0.1',
      });

      const promise = svc.remoteStartTransaction('charger-live', {
        connectorId: 1,
        idTag: 'RFID-OK',
      });

      // Giả lập charger phản hồi Accepted
      const [sentMsg] = socket.send.mock.calls;
      const parsed: any[] = JSON.parse(sentMsg[0]);
      const messageId = parsed[1];  // [2, messageId, action, payload]

      // Resolve the pending call manually
      const handler = (svc as any).pendingCalls.get(messageId);
      expect(handler).toBeDefined();
      handler({ status: 'Accepted' });

      const result = await promise;
      expect(result).toBe(true);
    });
  });

  describe('RemoteStopTransaction', () => {
    it('resolves true khi charger reply Accepted', async () => {
      const { svc } = makeService();
      const socket = makeSocket(1);

      (svc as any).chargers.set('charger-live', {
        chargerId: 'charger-live',
        socket,
        connectedAt: new Date(),
        ipAddress: '10.0.0.1',
      });

      const promise = svc.remoteStopTransaction('charger-live', 12345);

      const [sentMsg] = socket.send.mock.calls;
      const parsed: any[] = JSON.parse(sentMsg[0]);
      const messageId = parsed[1];

      const handler = (svc as any).pendingCalls.get(messageId);
      handler({ status: 'Accepted' });

      expect(await promise).toBe(true);
    });

    it('resolves false khi charger reply Rejected', async () => {
      const { svc } = makeService();
      const socket = makeSocket(1);

      (svc as any).chargers.set('charger-live', {
        chargerId: 'charger-live',
        socket,
        connectedAt: new Date(),
        ipAddress: '10.0.0.1',
      });

      const promise = svc.remoteStopTransaction('charger-live', 99999);

      const [sentMsg] = socket.send.mock.calls;
      const parsed: any[] = JSON.parse(sentMsg[0]);
      const messageId = parsed[1];

      const handler = (svc as any).pendingCalls.get(messageId);
      handler({ status: 'Rejected' });

      expect(await promise).toBe(false);
    });
  });
});

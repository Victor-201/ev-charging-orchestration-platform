/**
 * Tests: OcppGatewayService - State Management & Command Logic
 *
 * Pure unit tests - no real WebSocket server needed, no RabbitMQ needed.
 * Test: connection registry, pendingCalls map, isConnected(), getConnectedChargers().
 */
import { OcppGatewayService } from '../../src/ocpp/ocpp-gateway.service';

// Mock AmqpConnection

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

  // OcppGatewayService needs AmqpConnection and ConfigService
  const svc = new OcppGatewayService(mockAmqp as any, mockConfig as any);
  return { svc, mockAmqp };
}

// Mock WebSocket helper

function makeSocket(readyState: number = 1 /* OPEN */) {
  return {
    readyState,
    send:  jest.fn(),
    close: jest.fn(),
    on:    jest.fn(),
  };
}

import { Logger } from '@nestjs/common';

// Tests

describe('OcppGatewayService', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Connection Registry', () => {
    it('isConnected() -> false for disconnected charger', () => {
      const { svc } = makeService();
      expect(svc.isConnected('charger-001')).toBe(false);
    });

    it('getConnectedChargers() -> empty when not connected', () => {
      const { svc } = makeService();
      expect(svc.getConnectedChargers()).toHaveLength(0);
    });

    it('isConnected() -> true after registerCharger()', () => {
      const { svc } = makeService();
      const socket = makeSocket(1);  // readyState = OPEN

      // Inject charger directly into internal map (test private state)
      (svc as any).chargers.set('charger-001', {
        chargerId: 'charger-001',
        socket,
        connectedAt: new Date(),
        ipAddress: '192.168.1.100',
      });

      expect(svc.isConnected('charger-001')).toBe(true);
    });

    it('isConnected() -> false when socket is closed (readyState = 3 CLOSED)', () => {
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

    it('getConnectedChargers() returns all current connections', () => {
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
    it('returns false after timeout if charger not connected', async () => {
      const { svc } = makeService();

      // Charger not in registry -> timeout immediately
      // Override timeout to avoid slow tests (mock internal)
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

    it('returns false after timeout if charger socket is closed', async () => {
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

    it('resolves true when charger replies Accepted in pendingCalls', async () => {
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

      // Mock charger responding with Accepted
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
    it('resolves true when charger replies Accepted', async () => {
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

    it('resolves false when charger replies Rejected', async () => {
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

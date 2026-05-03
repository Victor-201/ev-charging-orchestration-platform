import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { v4 as uuidv4 } from 'uuid';

// ─── OCPP 1.6J Message Types ─────────────────────────────────────────────────
// [2, messageId, action, payload]  — Call
// [3, messageId, payload]          — CallResult
// [4, messageId, errorCode, errorDescription, errorDetails] — CallError

export type OcppMessage =
  | [2, string, string, object]       // Call
  | [3, string, object]               // CallResult
  | [4, string, string, string, object]; // CallError

// ─── Charger Connection Registry ─────────────────────────────────────────────

export interface ChargerConnection {
  chargerId:   string;
  socket:      WebSocket;
  connectedAt: Date;
  lastHeartbeat: Date;
  status:      'online' | 'offline';
}

/**
 * OcppGatewayService
 *
 * Implements OCPP 1.6J WebSocket Server (JSON profile).
 *
 * Responsibilities:
 *  1. Accept charger WS connections at ws://host:PORT/ocpp/:chargerId
 *  2. Handle: BootNotification, Heartbeat, StatusNotification, MeterValues,
 *             StartTransaction, StopTransaction, Authorize
 *  3. Forward MeterValues → RabbitMQ ev.telemetry (telemetry.ingested)
 *  4. Forward charger status changes → RabbitMQ ev.charging (charger.status.changed)
 *  5. Receive RemoteStart/Stop commands from RabbitMQ → send to charger
 */
@Injectable()
export class OcppGatewayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OcppGatewayService.name);
  private wss: WebSocketServer;
  private readonly chargers = new Map<string, ChargerConnection>();
  private readonly pendingCalls = new Map<string, (result: object) => void>();

  constructor(
    private readonly config:  ConfigService,
    private readonly amqp:    AmqpConnection,
  ) {}

  onModuleInit(): void {
    const port = this.config.get<number>('OCPP_WS_PORT', 9000);

    this.wss = new WebSocketServer({ port, path: '/ocpp' });

    this.wss.on('connection', (socket: WebSocket, req: IncomingMessage) => {
      // chargerId from URL: /ocpp/:chargerId
      const chargerId = req.url?.split('/').pop() ?? 'unknown';
      this.registerCharger(chargerId, socket);
    });

    this.wss.on('error', (err) => {
      this.logger.error(`WebSocket Server error: ${err.message}`);
    });

    this.logger.log(`OCPP 1.6J WebSocket Server listening on ws://0.0.0.0:${port}/ocpp/:chargerId`);
  }

  onModuleDestroy(): void {
    this.wss?.close();
    this.chargers.clear();
  }

  // ─── Charger Lifecycle ──────────────────────────────────────────────────────

  private registerCharger(chargerId: string, socket: WebSocket): void {
    const conn: ChargerConnection = {
      chargerId,
      socket,
      connectedAt:   new Date(),
      lastHeartbeat: new Date(),
      status:        'online',
    };
    this.chargers.set(chargerId, conn);

    this.logger.log(`Charger connected: ${chargerId} (total: ${this.chargers.size})`);

    socket.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString()) as OcppMessage;
        this.handleMessage(chargerId, msg);
      } catch (err: any) {
        this.logger.warn(`Invalid OCPP message from ${chargerId}: ${err.message}`);
      }
    });

    socket.on('close', () => {
      this.chargers.delete(chargerId);
      this.logger.warn(`Charger disconnected: ${chargerId}`);
      this.publishChargerStatus(chargerId, 'Offline', null).catch(() => {});
    });

    socket.on('error', (err) => {
      this.logger.error(`Socket error [${chargerId}]: ${err.message}`);
    });
  }

  // ─── OCPP Message Dispatcher ────────────────────────────────────────────────

  private async handleMessage(chargerId: string, msg: OcppMessage): Promise<void> {
    const [messageType] = msg;

    if (messageType === 2) {
      // Incoming Call from charger
      const [, messageId, action, payload] = msg as [2, string, string, object];
      await this.handleCall(chargerId, messageId, action, payload);
    } else if (messageType === 3) {
      // CallResult — response to our command
      const [, messageId, payload] = msg as [3, string, object];
      const resolver = this.pendingCalls.get(messageId);
      if (resolver) {
        resolver(payload);
        this.pendingCalls.delete(messageId);
      }
    } else if (messageType === 4) {
      // CallError
      const [, messageId, errorCode, errorDescription] = msg as [4, string, string, string, object];
      this.logger.error(`CallError from ${chargerId} [${messageId}]: ${errorCode} — ${errorDescription}`);
      const resolver = this.pendingCalls.get(messageId);
      if (resolver) {
        resolver({ error: errorCode });
        this.pendingCalls.delete(messageId);
      }
    }
  }

  private async handleCall(
    chargerId: string,
    messageId: string,
    action: string,
    payload: object,
  ): Promise<void> {
    switch (action) {
      case 'BootNotification':
        await this.handleBootNotification(chargerId, messageId, payload as any);
        break;
      case 'Heartbeat':
        this.handleHeartbeat(chargerId, messageId);
        break;
      case 'StatusNotification':
        await this.handleStatusNotification(chargerId, messageId, payload as any);
        break;
      case 'MeterValues':
        await this.handleMeterValues(chargerId, messageId, payload as any);
        break;
      case 'StartTransaction':
        await this.handleStartTransaction(chargerId, messageId, payload as any);
        break;
      case 'StopTransaction':
        await this.handleStopTransaction(chargerId, messageId, payload as any);
        break;
      case 'Authorize':
        this.sendCallResult(chargerId, messageId, { idTagInfo: { status: 'Accepted' } });
        break;
      default:
        this.logger.warn(`Unhandled OCPP action from ${chargerId}: ${action}`);
        this.sendCallResult(chargerId, messageId, {});
    }
  }

  // ─── OCPP Action Handlers ──────────────────────────────────────────────────

  private async handleBootNotification(
    chargerId: string,
    messageId: string,
    payload: { chargePointModel: string; chargePointVendor: string; chargePointSerialNumber?: string },
  ): Promise<void> {
    this.logger.log(
      `BootNotification: charger=${chargerId} vendor=${payload.chargePointVendor} model=${payload.chargePointModel}`,
    );

    // Accept & set heartbeat interval to 60s
    this.sendCallResult(chargerId, messageId, {
      status:            'Accepted',
      currentTime:       new Date().toISOString(),
      heartbeatInterval: 60,
    });

    // Publish to platform
    await this.amqp.publish('ev.charging', 'charger.boot.notification', {
      eventType:   'charger.boot.notification',
      chargerId,
      vendor:      payload.chargePointVendor,
      model:       payload.chargePointModel,
      serialNumber: payload.chargePointSerialNumber ?? null,
      bootedAt:    new Date().toISOString(),
    });
  }

  private handleHeartbeat(chargerId: string, messageId: string): void {
    const conn = this.chargers.get(chargerId);
    if (conn) conn.lastHeartbeat = new Date();

    this.sendCallResult(chargerId, messageId, {
      currentTime: new Date().toISOString(),
    });
  }

  private async handleStatusNotification(
    chargerId: string,
    messageId: string,
    payload: {
      connectorId: number;
      status: string;      // Available | Preparing | Charging | Finishing | Reserved | Unavailable | Faulted
      errorCode: string;
      info?: string;
      timestamp?: string;
    },
  ): Promise<void> {
    this.sendCallResult(chargerId, messageId, {});

    await this.publishChargerStatus(chargerId, payload.status, payload.errorCode);

    this.logger.log(
      `StatusNotification: charger=${chargerId} connector=${payload.connectorId} ` +
      `status=${payload.status} error=${payload.errorCode}`,
    );
  }

  /**
   * Task 1.4 — MeterValues → RabbitMQ ev.telemetry
   * Maps OCPP 1.6J measurand types to platform telemetry fields.
   */
  private async handleMeterValues(
    chargerId: string,
    messageId: string,
    payload: {
      connectorId:      number;
      transactionId?:   number;
      meterValue:       Array<{
        timestamp: string;
        sampledValue: Array<{
          value:     string;
          measurand?: string;
          unit?:     string;
          context?:  string;
        }>;
      }>;
    },
  ): Promise<void> {
    this.sendCallResult(chargerId, messageId, {});

    for (const mv of payload.meterValue) {
      const hwTimestamp = mv.timestamp;

      // Parse measurand values
      let powerKw:      number | undefined;
      let currentA:     number | undefined;
      let voltageV:     number | undefined;
      let meterWh:      number | undefined;
      let socPercent:   number | undefined;
      let temperatureC: number | undefined;

      for (const sv of mv.sampledValue) {
        const val = parseFloat(sv.value);
        if (isNaN(val)) continue;

        switch (sv.measurand) {
          case 'Power.Active.Import':
            powerKw = sv.unit === 'W' ? val / 1000 : val;
            break;
          case 'Current.Import':
            currentA = val;
            break;
          case 'Voltage':
            voltageV = val;
            break;
          case 'Energy.Active.Import.Register':
            meterWh = sv.unit === 'kWh' ? val * 1000 : val;
            break;
          case 'SoC':
            socPercent = val;
            break;
          case 'Temperature':
            temperatureC = val;
            break;
          default:
            if (!sv.measurand) {
              // Default measurand = Energy (kWh)
              meterWh = val * 1000;
            }
        }
      }

      // Publish to ev.telemetry exchange
      await this.amqp.publish('ev.telemetry', 'telemetry.ingested', {
        eventType:          'telemetry.ingested',
        eventId:            uuidv4(),
        chargerId,
        sessionId:          String(payload.transactionId ?? 'unknown'),
        hardwareTimestamp:  hwTimestamp,          // ← Task 5.1: dùng cho offline resilience
        powerKw:            powerKw ?? null,
        currentA:           currentA ?? null,
        voltageV:           voltageV ?? null,
        meterWh:            meterWh ?? null,
        socPercent:         socPercent ?? null,
        temperatureC:       temperatureC ?? null,
        publishedAt:        new Date().toISOString(),
      });

      this.logger.debug(
        `MeterValues: charger=${chargerId} power=${powerKw}kW ` +
        `energy=${meterWh}Wh soc=${socPercent}%`,
      );
    }
  }

  private async handleStartTransaction(
    chargerId: string,
    messageId: string,
    payload: { connectorId: number; idTag: string; meterStart: number; timestamp: string },
  ): Promise<void> {
    // Generate a transaction ID for charger tracking
    const transactionId = Math.floor(Math.random() * 1_000_000);

    this.sendCallResult(chargerId, messageId, {
      transactionId,
      idTagInfo: { status: 'Accepted' },
    });

    await this.amqp.publish('ev.charging', 'charger.transaction.started', {
      eventType:     'charger.transaction.started',
      chargerId,
      transactionId,
      idTag:         payload.idTag,
      connectorId:   payload.connectorId,
      meterStart:    payload.meterStart,
      timestamp:     payload.timestamp,
    });

    this.logger.log(`StartTransaction: charger=${chargerId} txn=${transactionId} idTag=${payload.idTag}`);
  }

  private async handleStopTransaction(
    chargerId: string,
    messageId: string,
    payload: {
      transactionId: number;
      meterStop:     number;
      timestamp:     string;
      reason?:       string;
      idTag?:        string;
    },
  ): Promise<void> {
    this.sendCallResult(chargerId, messageId, {
      idTagInfo: { status: 'Accepted' },
    });

    await this.amqp.publish('ev.charging', 'charger.transaction.stopped', {
      eventType:     'charger.transaction.stopped',
      chargerId,
      transactionId: payload.transactionId,
      meterStop:     payload.meterStop,
      reason:        payload.reason ?? 'Local',
      timestamp:     payload.timestamp,
    });

    this.logger.log(
      `StopTransaction: charger=${chargerId} txn=${payload.transactionId} ` +
      `meterStop=${payload.meterStop}Wh reason=${payload.reason}`,
    );
  }

  // ─── Task 1.3 — Send Commands to Charger ───────────────────────────────────

  /**
   * RemoteStartTransaction — triggered by platform when session should start.
   * Called by OcppCommandConsumer when it receives 'ocpp.remote.start' from RabbitMQ.
   */
  async remoteStartTransaction(chargerId: string, opts: {
    connectorId: number;
    idTag:       string;
    chargingProfileKw?: number;
  }): Promise<boolean> {
    const messageId = uuidv4();

    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingCalls.delete(messageId);
        this.logger.warn(`RemoteStartTransaction timeout for charger=${chargerId}`);
        resolve(false);
      }, 30_000);

      this.pendingCalls.set(messageId, (result: any) => {
        clearTimeout(timeout);
        const accepted = result?.status === 'Accepted';
        this.logger.log(
          `RemoteStartTransaction response: charger=${chargerId} status=${result?.status}`,
        );
        resolve(accepted);
      });

      this.sendCall(chargerId, messageId, 'RemoteStartTransaction', {
        connectorId: opts.connectorId,
        idTag:       opts.idTag,
      });
    });
  }

  /**
   * RemoteStopTransaction — triggered by platform when session should stop.
   */
  async remoteStopTransaction(chargerId: string, transactionId: number): Promise<boolean> {
    const messageId = uuidv4();

    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingCalls.delete(messageId);
        resolve(false);
      }, 30_000);

      this.pendingCalls.set(messageId, (result: any) => {
        clearTimeout(timeout);
        resolve(result?.status === 'Accepted');
      });

      this.sendCall(chargerId, messageId, 'RemoteStopTransaction', { transactionId });
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private sendCallResult(chargerId: string, messageId: string, payload: object): void {
    const msg: OcppMessage = [3, messageId, payload];
    this.send(chargerId, msg);
  }

  private sendCall(chargerId: string, messageId: string, action: string, payload: object): void {
    const msg: OcppMessage = [2, messageId, action, payload];
    this.send(chargerId, msg);
  }

  private send(chargerId: string, msg: OcppMessage): void {
    const conn = this.chargers.get(chargerId);
    if (!conn || conn.socket.readyState !== WebSocket.OPEN) {
      this.logger.warn(`Cannot send to charger=${chargerId}: not connected`);
      return;
    }
    conn.socket.send(JSON.stringify(msg));
  }

  private async publishChargerStatus(
    chargerId: string,
    status: string,
    errorCode: string | null,
  ): Promise<void> {
    await this.amqp.publish('ev.charging', 'charger.status.changed', {
      eventType:  'charger.status.changed',
      chargerId,
      status,       // OCPP status: Available | Charging | Offline | Faulted ...
      errorCode,
      changedAt:  new Date().toISOString(),
    });
  }

  // ─── Public Queries ─────────────────────────────────────────────────────────

  getConnectedChargers(): ChargerConnection[] {
    return [...this.chargers.values()];
  }

  isConnected(chargerId: string): boolean {
    const conn = this.chargers.get(chargerId);
    return conn?.socket.readyState === WebSocket.OPEN;
  }
}

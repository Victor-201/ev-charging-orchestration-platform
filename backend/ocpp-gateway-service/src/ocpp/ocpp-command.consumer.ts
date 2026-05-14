import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { OcppGatewayService } from './ocpp-gateway.service';

/**
 * OcppCommandConsumer
 *
 * Listen to commands from platform backend -> convert to OCPP commands
 * send to physical chargers via WebSocket.
 *
 * Events consumed:
 *   - ocpp.remote.start  -> RemoteStartTransaction
 *   - ocpp.remote.stop   -> RemoteStopTransaction
 */
@Injectable()
export class OcppCommandConsumer {
  private readonly logger = new Logger(OcppCommandConsumer.name);

  constructor(private readonly gateway: OcppGatewayService) {}

  /**
   * Platform -> Charger: Trigger remote start (after QR validation)
   * Routing key: ocpp.remote.start
   */
  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'ocpp.remote.start',
    queue:        'ocpp-gw.remote.start',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handleRemoteStart(payload: {
    chargerId:          string;
    connectorId:        number;
    idTag:              string;
    sessionId?:         string;
    chargingProfileKw?: number;
  }): Promise<void> {
    this.logger.log(
      `RemoteStart command: charger=${payload.chargerId} ` +
      `connector=${payload.connectorId} idTag=${payload.idTag}`,
    );

    if (!this.gateway.isConnected(payload.chargerId)) {
      this.logger.error(
        `Charger ${payload.chargerId} is not connected - cannot RemoteStart`,
      );
      return;
    }

    const accepted = await this.gateway.remoteStartTransaction(payload.chargerId, {
      connectorId:        payload.connectorId,
      idTag:              payload.idTag,
      chargingProfileKw:  payload.chargingProfileKw,
    });

    this.logger.log(
      `RemoteStart result: charger=${payload.chargerId} accepted=${accepted}`,
    );
  }

  /**
   * Platform -> Charger: Trigger remote stop (session timeout / user request)
   * Routing key: ocpp.remote.stop
   */
  @RabbitSubscribe({
    exchange:     'ev.charging',
    routingKey:   'ocpp.remote.stop',
    queue:        'ocpp-gw.remote.stop',
    queueOptions: { durable: true, deadLetterExchange: 'ev.charging.dlx' },
  })
  async handleRemoteStop(payload: {
    chargerId:     string;
    transactionId: number;
  }): Promise<void> {
    this.logger.log(
      `RemoteStop command: charger=${payload.chargerId} txn=${payload.transactionId}`,
    );

    if (!this.gateway.isConnected(payload.chargerId)) {
      this.logger.error(`Charger ${payload.chargerId} not connected - cannot RemoteStop`);
      return;
    }

    const accepted = await this.gateway.remoteStopTransaction(
      payload.chargerId,
      payload.transactionId,
    );

    this.logger.log(
      `RemoteStop result: charger=${payload.chargerId} txn=${payload.transactionId} accepted=${accepted}`,
    );
  }
}

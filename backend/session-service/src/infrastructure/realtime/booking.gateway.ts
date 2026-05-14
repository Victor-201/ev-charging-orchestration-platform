import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/booking',
  cors: { origin: '*', credentials: true },
  transports: ['websocket'],
})
export class BookingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(BookingGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket): void {
    const userId = client.handshake.auth?.userId as string;
    if (!userId) {
      client.disconnect(true);
      return;
    }
    client.join(`user:${userId}`);
    this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Called after a booking state change - pushed to the specific user.
   */
  emitBookingUpdate(
    userId: string,
    data: { bookingId: string; status: string; chargerId: string },
  ): void {
    this.server.to(`user:${userId}`).emit('booking_updated', data);
  }

  /**
   * Called when charger slot status changes - broadcast to all watching.
   */
  emitSlotUpdate(chargerId: string, status: string): void {
    this.server.to(`charger:${chargerId}`).emit('slot_updated', { chargerId, status });
  }

  /**
   * Called when queue position changes for a user.
   */
  emitQueueUpdate(
    userId: string,
    data: { position: number; chargerId: string; estimatedWaitMinutes: number },
  ): void {
    this.server.to(`user:${userId}`).emit('queue_updated', data);
  }

  /**
   * Allow client to subscribe to a specific charger's slot updates.
   */
  subscribeToCharger(client: Socket, chargerId: string): void {
    client.join(`charger:${chargerId}`);
  }
}

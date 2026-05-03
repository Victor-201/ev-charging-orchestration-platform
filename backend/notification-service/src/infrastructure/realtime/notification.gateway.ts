import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

/**
 * NotificationGateway — Socket.IO Realtime Delivery
 *
 * Namespace: /notifications
 *
 * Room strategy:
 *   client join room 'user:{userId}' sau khi authenticate.
 *   Server emit đến room này khi có notification mới.
 *
 * Events emitted TO client:
 *   - 'notification'      → new notification object (bất kỳ type)
 *   - 'booking_update'    → booking status change
 *   - 'queue_update'      → queue position change
 *   - 'charging_update'   → session status change
 *
 * Events received FROM client:
 *   - 'subscribe'         → { userId } — join user room
 *   - 'mark_read'         → { notificationId }
 *
 * Auth: userId lấy từ socket handshake auth hoặc query param.
 *       Production: verify JWT token từ auth header.
 */
@WebSocketGateway({
  cors:       { origin: '*' },
  namespace:  '/notifications',
  transports: ['websocket', 'polling'],
})
@Injectable()
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  // Track connected users: socketId → userId
  private readonly connectedUsers = new Map<string, string>();

  afterInit(server: Server) {
    this.logger.log('NotificationGateway initialized on namespace /notifications');
  }

  handleConnection(client: Socket) {
    // Extract userId từ handshake (Gateway nên validate JWT ở đây)
    const userId =
      client.handshake.auth?.userId ||
      client.handshake.query?.userId as string;

    if (userId) {
      client.join(`user:${userId}`);
      this.connectedUsers.set(client.id, userId);
      this.logger.debug(`Client ${client.id} connected → room user:${userId}`);
      // Confirm subscription
      client.emit('subscribed', { userId, roomId: `user:${userId}` });
    } else {
      this.logger.debug(`Client ${client.id} connected (no userId yet)`);
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
    this.logger.debug(`Client ${client.id} disconnected`);
  }

  /**
   * Client explicit subscribe — gửi userId sau khi login.
   * Dùng khi client cần join sau connection (lazy auth).
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.userId) return;
    client.join(`user:${data.userId}`);
    this.connectedUsers.set(client.id, data.userId);
    this.logger.debug(`Client ${client.id} subscribed → user:${data.userId}`);
    client.emit('subscribed', { userId: data.userId });
  }

  // ─── Emit Methods (called by DeliveryEngine) ─────────────────────────────

  /**
   * Push generic notification đến user room.
   * Payload: { id, type, title, body, metadata, createdAt }
   */
  emitToUser(userId: string, notification: object): void {
    this.server.to(`user:${userId}`).emit('notification', notification);
    this.logger.debug(`Emitted 'notification' to user:${userId}`);
  }

  /**
   * Booking update — emitted khi booking.confirmed, booking.cancelled, etc.
   */
  emitBookingUpdate(userId: string, payload: {
    bookingId: string;
    status:    string;
    message:   string;
    metadata?: object;
  }): void {
    this.server.to(`user:${userId}`).emit('booking_update', payload);
    this.logger.debug(`Emitted 'booking_update' to user:${userId} bookingId=${payload.bookingId}`);
  }

  /**
   * Queue update — emitted khi queue.updated.
   */
  emitQueueUpdate(userId: string, payload: {
    queueId:               string;
    position:              number;
    estimatedWaitMinutes:  number;
    status:                string;
    chargerId:             string;
  }): void {
    this.server.to(`user:${userId}`).emit('queue_update', payload);
    this.logger.debug(`Emitted 'queue_update' to user:${userId} position=${payload.position}`);
  }

  /**
   * Charging update — emitted khi session.started, session.completed.
   */
  emitChargingUpdate(userId: string, payload: {
    sessionId?:   string;
    eventType:    string;
    kwhConsumed?: number;
    durationMin?: number;
    message:      string;
  }): void {
    this.server.to(`user:${userId}`).emit('charging_update', payload);
    this.logger.debug(`Emitted 'charging_update' to user:${userId} type=${payload.eventType}`);
  }

  /** Số lượng clients đang kết nối */
  get connectedCount(): number {
    return this.connectedUsers.size;
  }
}

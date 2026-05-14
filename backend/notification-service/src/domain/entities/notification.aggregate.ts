/**
 * Notification Domain Aggregates
 *
 * Clean Architecture: Domain layer does not depend on framework or infrastructure.
 * All business invariants are enforced here.
 */
import { v4 as uuidv4 } from 'uuid';

// Types & Enums

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';
export type NotificationType =
  | 'booking.created' | 'booking.confirmed' | 'booking.cancelled'
  | 'booking.expired' | 'booking.no_show'
  | 'payment.completed' | 'payment.failed'
  | 'session.started' | 'session.completed'
  | 'queue.updated' | 'charger.fault' | 'system'
  | 'billing.idle_fee_charged_v1'   // Idle fee charged
  | 'billing.extra_charge_v1'       // Extra charge from wallet
  | 'billing.refund_issued_v1';     // Deposit refund to wallet


export type DevicePlatform = 'ios' | 'android' | 'web';

// Notification Aggregate

export interface NotificationProps {
  id:        string;
  userId:    string;
  type:      NotificationType;
  channel:   NotificationChannel;
  title:     string;
  body:      string;
  status:    NotificationStatus;
  metadata:  Record<string, any>;
  readAt:    Date | null;
  createdAt: Date;
}

/**
 * Notification — Aggregate Root
 *
 * Invariants:
 * - Cannot read an already read notification
 * - Cannot fail an already delivered notification
 * - title cannot be empty
 * - userId is required
 */
export class Notification {
  private readonly props: NotificationProps;

  private constructor(props: NotificationProps) {
    this.props = props;
  }

  static create(params: {
    userId:   string;
    type:     NotificationType;
    channel:  NotificationChannel;
    title:    string;
    body:     string;
    metadata?: Record<string, any>;
  }): Notification {
    if (!params.userId)         throw new Error('Notification: userId required');
    if (!params.title?.trim())  throw new Error('Notification: title required');
    if (!params.body?.trim())   throw new Error('Notification: body required');

    return new Notification({
      id:        uuidv4(),
      userId:    params.userId,
      type:      params.type,
      channel:   params.channel,
      title:     params.title.trim(),
      body:      params.body.trim(),
      status:    'pending',
      metadata:  params.metadata ?? {},
      readAt:    null,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: NotificationProps): Notification {
    return new Notification(props);
  }

  /** Mark as delivered (channel sent successfully) */
  markSent(): void {
    if (this.props.status === 'read') return;
    this.props.status = 'sent';
  }

  /** Mark as failed */
  markFailed(): void {
    if (this.props.status === 'read' || this.props.status === 'delivered') return;
    this.props.status = 'failed';
  }

  /** Mark as read by user */
  markRead(): void {
    if (this.props.status === 'read') return;
    this.props.status = 'read';
    this.props.readAt = new Date();
  }

  // Getters

  get id():        string             { return this.props.id; }
  get userId():    string             { return this.props.userId; }
  get type():      NotificationType   { return this.props.type; }
  get channel():   NotificationChannel{ return this.props.channel; }
  get title():     string             { return this.props.title; }
  get body():      string             { return this.props.body; }
  get status():    NotificationStatus { return this.props.status; }
  get metadata():  Record<string,any> { return this.props.metadata; }
  get readAt():    Date | null        { return this.props.readAt; }
  get createdAt(): Date               { return this.props.createdAt; }
  get isRead():    boolean            { return this.props.status === 'read'; }
}

// Device Aggregate

export interface DeviceProps {
  id:           string;
  userId:       string;
  platform:     DevicePlatform;
  pushToken:    string;
  deviceName:   string | null;
  lastActiveAt: Date;
  createdAt:    Date;
}

/**
 * Device — Aggregate Root
 *
 * Invariants:
 * - pushToken must be non-empty (FCM token)
 * - 1 pushToken only belongs to 1 user (enforced at DB level UNIQUE)
 */
export class Device {
  private readonly props: DeviceProps;

  private constructor(props: DeviceProps) {
    this.props = props;
  }

  static register(params: {
    userId:     string;
    platform:   DevicePlatform;
    pushToken:  string;
    deviceName?: string;
  }): Device {
    if (!params.userId)    throw new Error('Device: userId required');
    if (!params.pushToken) throw new Error('Device: pushToken (FCM token) required');

    return new Device({
      id:           uuidv4(),
      userId:       params.userId,
      platform:     params.platform,
      pushToken:    params.pushToken,
      deviceName:   params.deviceName ?? null,
      lastActiveAt: new Date(),
      createdAt:    new Date(),
    });
  }

  static reconstitute(props: DeviceProps): Device {
    return new Device(props);
  }

  /** Update with new FCM token (token rotation) */
  updateToken(newToken: string): void {
    if (!newToken) throw new Error('Device: new pushToken required');
    this.props.pushToken    = newToken;
    this.props.lastActiveAt = new Date();
  }

  refreshActivity(): void {
    this.props.lastActiveAt = new Date();
  }

  get id():           string        { return this.props.id; }
  get userId():       string        { return this.props.userId; }
  get platform():     DevicePlatform{ return this.props.platform; }
  get pushToken():    string        { return this.props.pushToken; }
  get deviceName():   string | null { return this.props.deviceName; }
  get lastActiveAt(): Date          { return this.props.lastActiveAt; }
  get createdAt():    Date          { return this.props.createdAt; }
}

// NotificationPreference Aggregate

export interface NotificationPreferenceProps {
  userId:          string;
  enablePush:      boolean;
  enableRealtime:  boolean;
  enableEmail:     boolean;
  enableSms:       boolean;
  quietHoursStart: number | null;  // 0-23 (quiet start hour)
  quietHoursEnd:   number | null;  // 0-23
  updatedAt:       Date;
}

/**
 * NotificationPreference — Aggregate Root (1 per user)
 *
 * Determines which channels are enabled for sending notifications.
 * Quiet hours: push notifications are suppressed during this period.
 */
export class NotificationPreference {
  private readonly props: NotificationPreferenceProps;

  private constructor(props: NotificationPreferenceProps) {
    this.props = props;
  }

  /** Create with default settings (all enabled) */
  static createDefault(userId: string): NotificationPreference {
    if (!userId) throw new Error('NotificationPreference: userId required');
    return new NotificationPreference({
      userId,
      enablePush:      true,
      enableRealtime:  true,
      enableEmail:     true,
      enableSms:       false,
      quietHoursStart: null,
      quietHoursEnd:   null,
      updatedAt:       new Date(),
    });
  }

  static reconstitute(props: NotificationPreferenceProps): NotificationPreference {
    return new NotificationPreference(props);
  }

  /** Check if a push notification can be sent now (evaluates quiet hours) */
  canSendPushNow(): boolean {
    if (!this.props.enablePush) return false;
    if (this.props.quietHoursStart == null || this.props.quietHoursEnd == null) return true;

    const currentHour = new Date().getUTCHours();
    const start = this.props.quietHoursStart;
    const end   = this.props.quietHoursEnd;

    // Handle overnight range (e.g. 22:00 -> 07:00)
    if (start > end) {
      return currentHour < start && currentHour >= end;
    }
    return !(currentHour >= start && currentHour < end);
  }

  updatePreferences(update: Partial<Omit<NotificationPreferenceProps, 'userId' | 'updatedAt'>>): void {
    Object.assign(this.props, update);
    this.props.updatedAt = new Date();
  }

  get userId():          string       { return this.props.userId; }
  get enablePush():      boolean      { return this.props.enablePush; }
  get enableRealtime():  boolean      { return this.props.enableRealtime; }
  get enableEmail():     boolean      { return this.props.enableEmail; }
  get enableSms():       boolean      { return this.props.enableSms; }
  get quietHoursStart(): number | null{ return this.props.quietHoursStart; }
  get quietHoursEnd():   number | null{ return this.props.quietHoursEnd; }
}

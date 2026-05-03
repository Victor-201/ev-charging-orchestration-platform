/**
 * ChargerState Aggregate Root
 *
 * Tracks real-time state of a charger per charging-service's perspective.
 * Do NOT duplicate station-service charger metadata — only operational state.
 *
 * States:
 *  available   → charger sẵn sàng nhận session
 *  occupied    → đang có session active
 *  faulted     → lỗi phần cứng / OCPP error
 *  offline     → mất kết nối
 *  reserved    → booking confirmed, chờ user đến
 */
export type ChargerAvailability =
  | 'available'
  | 'occupied'
  | 'faulted'
  | 'offline'
  | 'reserved';

export class ChargerStateException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChargerStateException';
  }
}

export class ChargerState {
  readonly chargerId: string;
  private _availability: ChargerAvailability;
  private _activeSessionId: string | null;
  private _lastHeartbeatAt: Date | null;
  private _errorCode: string | null;
  private _updatedAt: Date;

  private constructor(props: {
    chargerId: string;
    availability: ChargerAvailability;
    activeSessionId: string | null;
    lastHeartbeatAt: Date | null;
    errorCode: string | null;
    updatedAt: Date;
  }) {
    this.chargerId        = props.chargerId;
    this._availability    = props.availability;
    this._activeSessionId = props.activeSessionId;
    this._lastHeartbeatAt = props.lastHeartbeatAt;
    this._errorCode       = props.errorCode;
    this._updatedAt       = props.updatedAt;
  }

  static create(chargerId: string): ChargerState {
    return new ChargerState({
      chargerId,
      availability:    'available',
      activeSessionId: null,
      lastHeartbeatAt: null,
      errorCode:       null,
      updatedAt:       new Date(),
    });
  }

  static reconstitute(props: {
    chargerId: string;
    availability: ChargerAvailability;
    activeSessionId: string | null;
    lastHeartbeatAt: Date | null;
    errorCode: string | null;
    updatedAt: Date;
  }): ChargerState {
    return new ChargerState(props);
  }

  /** Booking confirmed → reserve charger */
  reserve(): void {
    if (!['available'].includes(this._availability)) {
      throw new ChargerStateException(
        `Cannot reserve charger ${this.chargerId} in state '${this._availability}'`,
      );
    }
    this._availability = 'reserved';
    this._updatedAt    = new Date();
  }

  /** Session started → mark occupied */
  occupy(sessionId: string): void {
    if (!['available', 'reserved'].includes(this._availability)) {
      throw new ChargerStateException(
        `Cannot occupy charger ${this.chargerId} — currently '${this._availability}'`,
      );
    }
    this._availability    = 'occupied';
    this._activeSessionId = sessionId;
    this._errorCode       = null;
    this._updatedAt       = new Date();
  }

  /** Session ended → return to available */
  release(): void {
    this._availability    = 'available';
    this._activeSessionId = null;
    this._errorCode       = null;
    this._updatedAt       = new Date();
  }

  /** OCPP error / hardware fault */
  fault(errorCode: string): void {
    this._availability = 'faulted';
    this._errorCode    = errorCode;
    this._updatedAt    = new Date();
  }

  /** Mất kết nối */
  goOffline(): void {
    this._availability = 'offline';
    this._updatedAt    = new Date();
  }

  /** Kết nối lại */
  goOnline(): void {
    if (this._activeSessionId) {
      this._availability = 'occupied'; // vẫn còn session
    } else {
      this._availability = 'available';
    }
    this._lastHeartbeatAt = new Date();
    this._updatedAt       = new Date();
  }

  heartbeat(): void {
    this._lastHeartbeatAt = new Date();
    this._updatedAt       = new Date();
  }

  get availability():    ChargerAvailability { return this._availability; }
  get activeSessionId(): string | null       { return this._activeSessionId; }
  get lastHeartbeatAt(): Date | null         { return this._lastHeartbeatAt; }
  get errorCode():       string | null       { return this._errorCode; }
  get updatedAt():       Date                { return this._updatedAt; }
  get isAvailableForSession(): boolean {
    return ['available', 'reserved'].includes(this._availability);
  }
}

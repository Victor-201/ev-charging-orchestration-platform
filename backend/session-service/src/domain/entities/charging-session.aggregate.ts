/**
 * ChargingSession Aggregate Root
 *
 * FSM (theo scope): INIT → ACTIVE → STOPPED → BILLED
 *                         ↘ ERROR | INTERRUPTED
 *
 * Invariants:
 * - Chỉ một session active per charger tại một thời điểm
 * - endMeterWh phải >= startMeterWh
 * - Không thể thao tác session đã terminal
 * - idempotencyKey: prevent duplicate start commands
 */
export type SessionStatus =
  | 'init'        // Created, waiting for hardware confirm
  | 'active'      // Hardware started charging
  | 'stopped'     // Charging ended, pending billing
  | 'billed'      // Payment processed
  | 'error'
  | 'interrupted';

export type SessionInitiator = 'user' | 'system' | 'staff';

const TERMINAL_SESSION_STATUSES: SessionStatus[] = [
  'billed',
  'error',
  'interrupted',
];

/** Thời gian ân hạn sau khi sạc xong trước khi tính phí chiếm dụng: 15 phút */
export const IDLE_GRACE_MINUTES = 15;
/** Phí chiếm dụng: 2,000 VND/phút sau 15 phút ân hạn */
export const IDLE_FEE_PER_MINUTE_VND = 2_000;

export class ChargingSessionException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChargingSessionException';
  }
}

export class InvalidSessionStateException extends ChargingSessionException {
  constructor(currentStatus: SessionStatus, action: string) {
    super(`Cannot perform '${action}' on session in state '${currentStatus}'`);
    this.name = 'InvalidSessionStateException';
  }
}

export class ChargingSession {
  readonly id: string;
  readonly userId: string;
  readonly chargerId: string;
  readonly bookingId: string | null;
  readonly initiatedBy: SessionInitiator;
  readonly startMeterWh: number;
  readonly createdAt: Date;
  readonly idempotencyKey: string | null;

  private _status: SessionStatus;
  private _startTime: Date;
  private _endTime: Date | null;
  private _endMeterWh: number | null;
  private _errorReason: string | null;
  private _billedAt: Date | null;
  private _updatedAt: Date;
  /** Phí điện thực tế (VND) — được set khi stop() */
  private _energyFeeVnd: number | null;
  /** Phí chiếm dụng (VND) — cộng dồn sau khi idle detect job thêm vào */
  private _idleFeeVnd: number;
  /** Thời điểm sạc kết thúc (khi stop) — bắt đầu đếm idle */
  private _stoppedAt: Date | null;

  private constructor(props: {
    id: string;
    userId: string;
    chargerId: string;
    bookingId: string | null;
    initiatedBy: SessionInitiator;
    startMeterWh: number;
    idempotencyKey?: string | null;
    status: SessionStatus;
    startTime: Date;
    endTime: Date | null;
    endMeterWh: number | null;
    errorReason: string | null;
    billedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id              = props.id;
    this.userId          = props.userId;
    this.chargerId       = props.chargerId;
    this.bookingId       = props.bookingId;
    this.initiatedBy     = props.initiatedBy;
    this.startMeterWh    = props.startMeterWh;
    this.idempotencyKey  = props.idempotencyKey ?? null;
    this._status         = props.status;
    this._startTime      = props.startTime;
    this._endTime        = props.endTime;
    this._endMeterWh     = props.endMeterWh;
    this._errorReason    = props.errorReason;
    this._billedAt       = props.billedAt ?? null;
    this._energyFeeVnd   = (props as any).energyFeeVnd ?? null;
    this._idleFeeVnd     = (props as any).idleFeeVnd ?? 0;
    this._stoppedAt      = (props as any).stoppedAt ?? null;
    this.createdAt       = props.createdAt;
    this._updatedAt      = props.updatedAt;
  }

  /** Factory: tạo session mới — status = INIT */
  static create(props: {
    userId: string;
    chargerId: string;
    bookingId?: string;
    startMeterWh?: number;
    initiatedBy?: SessionInitiator;
    idempotencyKey?: string;
  }): ChargingSession {
    const now = new Date();
    return new ChargingSession({
      id:             crypto.randomUUID(),
      userId:         props.userId,
      chargerId:      props.chargerId,
      bookingId:      props.bookingId ?? null,
      initiatedBy:    props.initiatedBy ?? 'user',
      startMeterWh:   props.startMeterWh ?? 0,
      idempotencyKey: props.idempotencyKey ?? null,
      status:         'init',
      startTime:      now,
      endTime:        null,
      endMeterWh:     null,
      errorReason:    null,
      billedAt:       null,
      createdAt:      now,
      updatedAt:      now,
    });
  }

  static reconstitute(props: {
    id: string;
    userId: string;
    chargerId: string;
    bookingId: string | null;
    initiatedBy: SessionInitiator;
    startMeterWh: number;
    idempotencyKey?: string | null;
    status: SessionStatus;
    startTime: Date;
    endTime: Date | null;
    endMeterWh: number | null;
    errorReason: string | null;
    billedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ChargingSession {
    return new ChargingSession(props);
  }

  /** INIT → ACTIVE: hardware confirms charging started */
  activate(): void {
    if (this._status !== 'init') {
      throw new InvalidSessionStateException(this._status, 'activate');
    }
    this._status    = 'active';
    this._startTime = new Date();
    this._updatedAt = new Date();
  }

  /**
   * ACTIVE → STOPPED: sạc kết thúc, chờ billing
   * @param endMeterWh  mốc đượng đo cuối (Wh)
   * @param energyFeeVnd tiền điện thực tế (VND) — do charging service tính dựa vào giá biểu
   */
  stop(endMeterWh: number, energyFeeVnd = 0): void {
    if (this._status !== 'active') {
      throw new InvalidSessionStateException(this._status, 'stop');
    }
    if (endMeterWh < this.startMeterWh) {
      throw new ChargingSessionException(
        `endMeterWh (${endMeterWh}) must be >= startMeterWh (${this.startMeterWh})`,
      );
    }
    this._status       = 'stopped';
    this._endTime      = new Date();
    this._stoppedAt    = new Date();
    this._endMeterWh   = endMeterWh;
    this._energyFeeVnd = energyFeeVnd;
    this._updatedAt    = new Date();
  }

  /**
   * Thêm phí chiếm dụng (idle fee) — được gọi bởi IdleFeeDetectionJob
   * mỗi phút sau khi hết 15 phút ân hạn.
   */
  addIdleFee(additionalFeeVnd: number): void {
    if (this._status !== 'stopped') return; // chỉ tính khi đã stop
    this._idleFeeVnd += additionalFeeVnd;
    this._updatedAt   = new Date();
  }

  /**
   * STOPPED → BILLED: payment processed
   */
  bill(): void {
    if (this._status !== 'stopped') {
      throw new InvalidSessionStateException(this._status, 'bill');
    }
    this._status    = 'billed';
    this._billedAt  = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Legacy compat: ACTIVE → completed (maps to stopped for state machine)
   */
  complete(endMeterWh: number): void {
    this.stop(endMeterWh);
  }

  interrupt(reason: string): void {
    if (TERMINAL_SESSION_STATUSES.includes(this._status)) {
      throw new InvalidSessionStateException(this._status, 'interrupt');
    }
    this._status      = 'interrupted';
    this._endTime     = new Date();
    this._errorReason = reason;
    this._updatedAt   = new Date();
  }

  markError(reason: string, endMeterWh?: number): void {
    if (TERMINAL_SESSION_STATUSES.includes(this._status)) {
      throw new InvalidSessionStateException(this._status, 'markError');
    }
    this._status      = 'error';
    this._endTime     = new Date();
    this._endMeterWh  = endMeterWh ?? this._endMeterWh;
    this._errorReason = reason;
    this._updatedAt   = new Date();
  }

  get kwhConsumed(): number | null {
    if (this._endMeterWh === null) return null;
    return (this._endMeterWh - this.startMeterWh) / 1000;
  }

  get isTerminal(): boolean {
    return TERMINAL_SESSION_STATUSES.includes(this._status);
  }

  get status():       SessionStatus { return this._status; }
  get startTime():    Date          { return this._startTime; }
  get endTime():      Date | null   { return this._endTime; }
  get endMeterWh():   number | null { return this._endMeterWh; }
  get errorReason():  string | null { return this._errorReason; }
  get billedAt():     Date | null   { return this._billedAt; }
  get updatedAt():    Date          { return this._updatedAt; }
  get energyFeeVnd(): number | null { return this._energyFeeVnd; }
  get idleFeeVnd():   number        { return this._idleFeeVnd; }
  get stoppedAt():    Date | null   { return this._stoppedAt; }
  /** Tổng phí = tiền điện + phí chiếm dụng */
  get totalFeeVnd():  number        { return (this._energyFeeVnd ?? 0) + this._idleFeeVnd; }
}


export type TxType   = 'topup' | 'payment' | 'refund';
export type TxMethod = 'wallet' | 'bank_transfer' | 'cash';
export type TxStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type TxRelatedType = 'subscription' | 'booking' | 'charging_session' | 'guest_charging';

export class TransactionException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionException';
  }
}

const TERMINAL_TX_STATUSES: TxStatus[] = ['completed', 'failed', 'cancelled'];

/**
 * Transaction Aggregate Root
 *
 * FSM: pending → completed | failed | cancelled
 * Immutable after terminal state.
 */
export class Transaction {
  readonly id:            string;
  readonly userId:        string;
  readonly type:          TxType;
  readonly amount:        number;
  readonly currency:      string;
  readonly method:        TxMethod;
  readonly relatedId:     string | null;
  readonly relatedType:   TxRelatedType | null;
  readonly createdAt:     Date;

  private _status:         TxStatus;
  private _externalId:     string | null;
  private _referenceCode:  string | null;
  private _meta:           object | null;
  private _updatedAt:      Date;

  private constructor(props: {
    id:           string;
    userId:       string;
    type:         TxType;
    amount:       number;
    currency:     string;
    method:       TxMethod;
    relatedId:    string | null;
    relatedType:  TxRelatedType | null;
    status:       TxStatus;
    externalId:   string | null;
    referenceCode: string | null;
    meta:         object | null;
    createdAt:    Date;
    updatedAt:    Date;
  }) {
    this.id            = props.id;
    this.userId        = props.userId;
    this.type          = props.type;
    this.amount        = props.amount;
    this.currency      = props.currency;
    this.method        = props.method;
    this.relatedId     = props.relatedId;
    this.relatedType   = props.relatedType;
    this._status       = props.status;
    this._externalId   = props.externalId;
    this._referenceCode = props.referenceCode;
    this._meta         = props.meta;
    this.createdAt     = props.createdAt;
    this._updatedAt    = props.updatedAt;
  }

  static create(props: {
    userId:      string;
    type:        TxType;
    amount:      number;
    currency?:   string;
    method:      TxMethod;
    relatedId?:  string;
    relatedType?: TxRelatedType;
    meta?:       object;
    referenceCode?: string;
  }): Transaction {
    if (props.amount <= 0) throw new TransactionException('Amount must be positive');

    return new Transaction({
      id:            crypto.randomUUID(),
      userId:        props.userId,
      type:          props.type,
      amount:        props.amount,
      currency:      props.currency ?? 'VND',
      method:        props.method,
      relatedId:     props.relatedId    ?? null,
      relatedType:   props.relatedType  ?? null,
      status:        'pending',
      externalId:    null,
      referenceCode: props.referenceCode ?? null,
      meta:          props.meta ?? null,
      createdAt:     new Date(),
      updatedAt:     new Date(),
    });
  }

  static reconstitute(props: {
    id: string; userId: string; type: TxType; amount: number; currency: string;
    method: TxMethod; relatedId: string | null; relatedType: TxRelatedType | null;
    status: TxStatus; externalId: string | null; referenceCode: string | null;
    meta: object | null; createdAt: Date; updatedAt: Date;
  }): Transaction {
    return new Transaction(props);
  }

  complete(externalId?: string): void {
    this.assertNotTerminal('complete');
    this._status     = 'completed';
    this._externalId = externalId ?? this._externalId;
    this._updatedAt  = new Date();
  }

  fail(reason?: string): void {
    this.assertNotTerminal('fail');
    this._status = 'failed';
    this._meta   = { ...((this._meta ?? {}) as object), failureReason: reason };
    this._updatedAt = new Date();
  }

  cancel(): void {
    this.assertNotTerminal('cancel');
    this._status    = 'cancelled';
    this._updatedAt = new Date();
  }

  attachVNPayRef(vnpTxnRef: string, meta: object): void {
    this._referenceCode = vnpTxnRef;
    this._meta          = meta;
    this._updatedAt     = new Date();
  }

  private assertNotTerminal(action: string): void {
    if (TERMINAL_TX_STATUSES.includes(this._status)) {
      throw new TransactionException(
        `Cannot ${action} transaction in terminal state '${this._status}'`,
      );
    }
  }

  get status():        TxStatus        { return this._status; }
  get externalId():    string | null   { return this._externalId; }
  get referenceCode(): string | null   { return this._referenceCode; }
  get meta():          object | null   { return this._meta; }
  get updatedAt():     Date            { return this._updatedAt; }
}

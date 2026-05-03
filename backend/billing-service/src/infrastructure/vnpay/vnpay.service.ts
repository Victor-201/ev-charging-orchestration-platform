import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface VNPayParams {
  amount: number;        // VND amount (integer × 100)
  orderInfo: string;
  orderType: string;
  txnRef: string;        // Unique reference code (max 100 chars)
  returnUrl: string;
  ipAddr?: string;
  locale?: string;
  bankCode?: string;
}

export interface VNPayReturnParams extends Record<string, string> {
  vnp_Amount:            string;
  vnp_BankCode:          string;
  vnp_BankTranNo:        string;
  vnp_CardType:          string;
  vnp_OrderInfo:         string;
  vnp_PayDate:           string;
  vnp_ResponseCode:      string;
  vnp_TmnCode:           string;
  vnp_TransactionNo:     string;
  vnp_TransactionStatus: string;
  vnp_TxnRef:            string;
  vnp_SecureHash:        string;
}

export interface VNPayResult {
  isSuccess:       boolean;
  responseCode:    string;
  transactionNo:   string;
  bankCode:        string;
  amount:          number; // VND
  txnRef:          string;
  orderInfo:       string;
  payDate:         string;
}

/** VNPay response codes */
export const VNPAY_SUCCESS_CODE = '00';

/**
 * VNPayService — Production integration with VNPay Payment Gateway.
 *
 * Security:
 * - HMAC SHA512 signature generation and verification
 * - Strictly validates checksum before processing any callback
 * - Sorts params alphabetically before signing (VNPay requirement)
 */
@Injectable()
export class VNPayService {
  private readonly logger    = new Logger(VNPayService.name);
  private readonly tmnCode:   string;
  private readonly hashSecret: string;
  private readonly vnpUrl:    string;

  constructor(private readonly config: ConfigService) {
    this.tmnCode    = this.config.get<string>('VNPAY_TMN_CODE',   'EVCHARGE01');
    this.hashSecret = this.config.get<string>('VNPAY_HASH_SECRET', 'CHANGEME_SECRET_KEY_32_CHARS_LONG');
    this.vnpUrl     = this.config.get<string>('VNPAY_URL',
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    );
  }

  /**
   * Build VNPay payment URL.
   * Amount must be VND integer — VNPay multiplies by 100 internally.
   */
  buildPaymentUrl(params: VNPayParams): string {
    const now       = new Date();
    const createDate = this.formatDate(now);
    const expireDate = this.formatDate(new Date(now.getTime() + 15 * 60 * 1000)); // 15min

    const rawParams: Record<string, string> = {
      vnp_Version:    '2.1.0',
      vnp_Command:    'pay',
      vnp_TmnCode:    this.tmnCode,
      vnp_Locale:     params.locale ?? 'vn',
      vnp_CurrCode:   'VND',
      vnp_TxnRef:     params.txnRef,
      vnp_OrderInfo:  params.orderInfo,
      vnp_OrderType:  params.orderType,
      vnp_Amount:     String(params.amount * 100),  // VNPay requires ×100
      vnp_ReturnUrl:  params.returnUrl,
      vnp_IpAddr:     params.ipAddr ?? '127.0.0.1',
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    if (params.bankCode) {
      rawParams['vnp_BankCode'] = params.bankCode;
    }

    const signedParams = this.sortParams(rawParams);
    const queryString  = new URLSearchParams(signedParams).toString();
    const signature    = this.computeHmac(queryString);

    return `${this.vnpUrl}?${queryString}&vnp_SecureHash=${signature}`;
  }

  /**
   * Verify VNPay return/IPN callback.
   * Returns parsed result only if signature is valid.
   *
   * @throws Error if checksum is invalid (do NOT process payment)
   */
  verifyCallback(returnParams: VNPayReturnParams): VNPayResult {
    // Exclude hash fields before recomputing signature
    const { vnp_SecureHash, ...rest } = returnParams;

    // Remove hash-related fields before recomputing
    const paramsToVerify = this.sortParams(
      Object.fromEntries(
        Object.entries(rest).filter(
          ([k]) => k.startsWith('vnp_') && k !== 'vnp_SecureHashType',
        ),
      ),
    );
    const queryString = new URLSearchParams(paramsToVerify).toString();
    const expected    = this.computeHmac(queryString);

    if (!this.timingSafeCompare(expected, vnp_SecureHash)) {
      this.logger.warn(`VNPay checksum INVALID for txnRef=${returnParams.vnp_TxnRef}`);
      throw new Error('INVALID_CHECKSUM');
    }

    const amount = Math.round(parseInt(returnParams.vnp_Amount) / 100); // Remove ×100

    return {
      isSuccess:     returnParams.vnp_ResponseCode === VNPAY_SUCCESS_CODE,
      responseCode:  returnParams.vnp_ResponseCode,
      transactionNo: returnParams.vnp_TransactionNo,
      bankCode:      returnParams.vnp_BankCode,
      amount,
      txnRef:        returnParams.vnp_TxnRef,
      orderInfo:     returnParams.vnp_OrderInfo,
      payDate:       returnParams.vnp_PayDate,
    };
  }

  /** Sort params alphabetically (VNPay requirement for signature) */
  private sortParams(params: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== '' && v !== null && v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b)),
    );
  }

  /** HMAC SHA512 with hash secret */
  private computeHmac(data: string): string {
    return crypto
      .createHmac('sha512', this.hashSecret)
      .update(Buffer.from(data, 'utf-8'))
      .digest('hex');
  }

  /** Constant-time comparison to prevent timing attacks */
  private timingSafeCompare(a: string, b: string): boolean {
    try {
      // Both must be valid hex of equal length
      if (a.length !== b.length) return false;
      const bufA = Buffer.from(a, 'hex');
      const bufB = Buffer.from(b, 'hex');
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  /** Format date as YYYYMMDDHHmmss (VNPay format) */
  private formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds()),
    ].join('');
  }
}

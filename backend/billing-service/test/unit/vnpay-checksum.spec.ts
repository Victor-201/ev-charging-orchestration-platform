/**
 * Tests: VNPay Checksum Verification (Unit tests for VNPayService)
 *
 * No NestJS context required — pure crypto logic testing.
 */
import * as crypto from 'crypto';
import { VNPayService } from '../../src/infrastructure/vnpay/vnpay.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

function makeConfig(overrides?: Record<string, string>): ConfigService {
  const map: Record<string, string> = {
    VNPAY_TMN_CODE:    'EVCHARGE01',
    VNPAY_HASH_SECRET: 'TESTSECRETKEY_32_CHARS_LONG_XXXX',
    VNPAY_URL:         'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    ...overrides,
  };
  return { get: (key: string, def?: string) => map[key] ?? def } as any;
}

function computeHmac(secret: string, data: string): string {
  return crypto.createHmac('sha512', secret).update(Buffer.from(data, 'utf-8')).digest('hex');
}

describe('VNPayService', () => {
  let service: VNPayService;
  const SECRET = 'TESTSECRETKEY_32_CHARS_LONG_XXXX';

  beforeEach(() => {
    service = new VNPayService(makeConfig());
    // Forcefully mock the internal logger to be silent
    (service as any).logger = {
      log:   jest.fn(),
      warn:  jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };
  });

  describe('buildPaymentUrl', () => {
    it('creates a URL with a valid vnp_SecureHash', () => {
      const url = service.buildPaymentUrl({
        amount:    100000,
        orderInfo: 'test order',
        orderType: 'billpayment',
        txnRef:    'EVTEST001',
        returnUrl: 'http://localhost:3005/return',
        ipAddr:    '127.0.0.1',
      });

      expect(url).toContain('vnp_SecureHash=');
      expect(url).toContain('vnp_Amount=10000000'); // 100000 × 100
      expect(url).toContain('vnp_TxnRef=EVTEST001');
      expect(url).toContain('vnp_TmnCode=EVCHARGE01');
    });

    it('does not include empty parameters in the signature', () => {
      const url = service.buildPaymentUrl({
        amount:    50000,
        orderInfo: 'test',
        orderType: 'topup',
        txnRef:    'TOPUP001',
        returnUrl: 'http://localhost:3005/return',
        // bankCode không set
      });
      expect(url).not.toContain('vnp_BankCode=&');
    });
  });

  describe('verifyCallback', () => {
    function buildCallbackParams(txnRef: string, responseCode = '00') {
      const raw: Record<string, string> = {
        vnp_Amount:            '10000000',
        vnp_BankCode:          'NCB',
        vnp_BankTranNo:        'VNP12345678',
        vnp_CardType:          'ATM',
        vnp_OrderInfo:         'test',
        vnp_PayDate:           '20260412143000',
        vnp_ResponseCode:      responseCode,
        vnp_TmnCode:           'EVCHARGE01',
        vnp_TransactionNo:     '12345678',
        vnp_TransactionStatus: responseCode,
        vnp_TxnRef:            txnRef,
      };

      // Sort params alphabetically (VNPay requirement)
      const sorted = Object.fromEntries(
        Object.entries(raw).sort(([a], [b]) => a.localeCompare(b)),
      );
      const queryString = new URLSearchParams(sorted).toString();
      const hash = computeHmac(SECRET, queryString);

      return { ...raw, vnp_SecureHash: hash };
    }

    it('SUCCESS: valid callback — correctly parses amount and txnRef', () => {
      const params = buildCallbackParams('EVTEST001', '00');
      const result = service.verifyCallback(params as any);

      expect(result.isSuccess).toBe(true);
      expect(result.txnRef).toBe('EVTEST001');
      expect(result.amount).toBe(100000); // 10000000 / 100
      expect(result.responseCode).toBe('00');
    });

    it('FAILURE: responseCode != 00 → isSuccess = false', () => {
      const params = buildCallbackParams('EVTEST002', '51');
      const result = service.verifyCallback(params as any);

      expect(result.isSuccess).toBe(false);
      expect(result.responseCode).toBe('51');
    });

    it('SECURITY: invalid checksum — throws INVALID_CHECKSUM', () => {
      const params = buildCallbackParams('EVTEST003');
      // Tamper the hash
      params.vnp_SecureHash = params.vnp_SecureHash.replace('a', 'b').replace('1', '9');

      expect(() => service.verifyCallback(params as any)).toThrow('INVALID_CHECKSUM');
    });

    it('SECURITY: tampered amount → checksum mismatch', () => {
      const params = buildCallbackParams('EVTEST004') as Record<string, string>;
      // Attacker tampers amount AFTER signing
      params['vnp_Amount'] = '99999999999';

      expect(() => service.verifyCallback(params as any)).toThrow('INVALID_CHECKSUM');
    });

    it('SECURITY: collision-resistant — different secret — fails validation', () => {
      const otherService = new VNPayService(
        makeConfig({ VNPAY_HASH_SECRET: 'DIFFERENT_SECRET_KEY_32_CHARS_XX' }),
      );
      // Also mock this manual instance
      (otherService as any).logger = { warn: jest.fn(), log: jest.fn() };

      const params = buildCallbackParams('EVTEST005');

      expect(() => otherService.verifyCallback(params as any)).toThrow('INVALID_CHECKSUM');
    });
  });
});

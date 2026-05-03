import {
  Controller, Post, Body, Headers,
  UnauthorizedException, Logger, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FcmPushService } from '../../infrastructure/push/fcm-push.service';

/**
 * FcmTestController â€” Internal endpoint Ä‘á»ƒ test push notification.
 *
 * Protected bá»Ÿi INTERNAL_API_KEY header Ä‘á»ƒ trÃ¡nh expose public.
 * Chá»‰ dÃ¹ng cho development / QA validation.
 *
 * Usage:
 *   POST /api/v1/internal/fcm-test
 *   Header: x-internal-key: <FCM_TEST_API_KEY>
 *   Body: { "token": "<FCM_device_token>", "title": "Test", "body": "Hello" }
 *
 * Response:
 *   { "success": true, "messageId": "..." }
 *   { "success": false, "error": "..." }
 */
@Controller('internal/fcm-test')
export class FcmTestController {
  private readonly logger = new Logger(FcmTestController.name);

  constructor(
    private readonly fcm: FcmPushService,
    private readonly cfg: ConfigService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async test(
    @Headers('x-internal-key') apiKey: string,
    @Body() body: { token: string; title?: string; body?: string },
  ) {
    // â”€â”€ Guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const expectedKey = this.cfg.get<string>('FCM_TEST_API_KEY') ?? 'ev-internal-test-key';
    if (!apiKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid x-internal-key');
    }

    if (!body.token) {
      return { success: false, error: 'token is required in request body' };
    }

    this.logger.log(`FCM test: sending to token=...${body.token.slice(-8)}`);

    const result = await this.fcm.sendToToken({
      token: body.token,
      title: body.title ?? 'ðŸ”” EV Platform Test',
      body:  body.body  ?? 'Push notification is working!',
      data:  { source: 'fcm-test-endpoint', timestamp: Date.now().toString() },
    });

    if (result.success) {
      this.logger.log(`FCM test SUCCESS: token=...${body.token.slice(-8)}`);
      return { success: true, message: 'Push notification sent successfully' };
    } else {
      this.logger.warn(`FCM test FAILED: ${result.error}`);
      return { success: false, error: result.error };
    }
  }
}

import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Req,
  ParseUUIDPipe, DefaultValuePipe, ParseIntPipe, ParseBoolPipe,
  HttpCode, HttpStatus, Logger, UseGuards,
} from '@nestjs/common';
import {
  GetNotificationsUseCase,
  DeviceManagementUseCase,
  NotificationPreferenceUseCase,
} from '../../application/use-cases/notification.use-cases';
import { DevicePlatform } from '../../domain/entities/notification.aggregate';
import { JwtAuthGuard }             from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }               from '../../shared/guards/roles.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser }   from '../../shared/guards/jwt-auth.guard';

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ DTOs Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

class RegisterDeviceDto {
  platform:   DevicePlatform;
  pushToken:  string;
  deviceName?: string;
}

class UpdatePreferenceDto {
  enablePush?:      boolean;
  enableRealtime?:  boolean;
  enableEmail?:     boolean;
  enableSms?:       boolean;
  quietHoursStart?: number | null;
  quietHoursEnd?:   number | null;
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ NotificationController Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

/**
 * Notification REST API
 *
 * Routes (prefix: /api/v1/notifications):
 *
 *   GET  /                         Ã¢â€ â€™ list notifications (paginated)
 *   GET  /unread                   Ã¢â€ â€™ unread notifications + count
 *   PATCH /:id/read                Ã¢â€ â€™ mark one notification as read
 *   PATCH /read-all                Ã¢â€ â€™ mark all as read
 *
 * Auth: userId lÃ¡ÂºÂ¥y tÃ¡Â»Â« Gateway header 'x-user-id' (Kong inject sau JWT verify).
 *       Development: fallback to query param ?userId=
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly getUC: GetNotificationsUseCase) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit',      new DefaultValuePipe(20), ParseIntPipe)    limit:      number,
    @Query('unreadOnly', new DefaultValuePipe(false), ParseBoolPipe) unreadOnly: boolean,
  ) {
    return this.getUC.execute(user.id, Math.min(limit, 100), unreadOnly);
  }

  @Get('unread')
  async getUnread(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.getUC.execute(user.id, Math.min(limit, 100), true);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.getUC.markRead(id, user.id);
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.getUC.markAllRead(user.id);
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ DeviceController Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

/**
 * Device Management API
 *
 *   POST   /api/v1/devices/register Ã¢â€ â€™ register FCM token
 *   DELETE /api/v1/devices/:id      Ã¢â€ â€™ unregister device (logout / revoke)
 *   GET    /api/v1/devices          Ã¢â€ â€™ list user's devices
 */
@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeviceController {
  private readonly logger = new Logger(DeviceController.name);

  constructor(private readonly deviceUC: DeviceManagementUseCase) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() body: RegisterDeviceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!['ios', 'android', 'web'].includes(body.platform)) {
      return { error: "platform phÃ¡ÂºÂ£i lÃƒÂ  'ios', 'android', hoÃ¡ÂºÂ·c 'web'" };
    }
    if (!body.pushToken) {
      return { error: 'pushToken (FCM token) lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c' };
    }
    const device = await this.deviceUC.register({
      userId:     user.id,
      platform:   body.platform,
      pushToken:  body.pushToken,
      deviceName: body.deviceName,
    });
    return { deviceId: device.id, message: 'Device registered' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unregister(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.deviceUC.unregister(id, user.id);
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const devices = await this.deviceUC.listForUser(user.id);
    return devices.map((d) => ({
      id:            d.id,
      platform:      d.platform,
      deviceName:    d.deviceName,
      lastActiveAt:  d.lastActiveAt,
      createdAt:     d.createdAt,
      pushTokenHint: `...${d.pushToken.slice(-8)}`,
    }));
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ PreferenceController Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

/**
 * Notification Preferences API
 *
 *   GET   /api/v1/preferences
 *   PATCH /api/v1/preferences
 */
@Controller('preferences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PreferenceController {
  constructor(private readonly prefUC: NotificationPreferenceUseCase) {}

  @Get()
  async get(@CurrentUser() user: AuthenticatedUser) {
    return this.prefUC.getOrCreate(user.id);
  }

  @Patch()
  async update(
    @Body() body: UpdatePreferenceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prefUC.update(user.id, body);
  }
}


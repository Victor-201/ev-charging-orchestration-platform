import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reflector } from '@nestjs/core';
import { UserDebtReadModelOrmEntity } from '../../infrastructure/persistence/typeorm/entities/booking.orm-entities';

export const SKIP_ARREARS_CHECK = 'skipArrearsCheck';

/**
 * @SkipArrearsCheck() - Decorator to skip arrears check for specific handler.
 * Used for GET endpoints (read-only) that don't need blocking.
 */
export const SkipArrearsCheck = () => SetMetadata(SKIP_ARREARS_CHECK, true);

/**
 * ArrearsGuard - Block bad debt
 *
 * Applied to POST /bookings and POST /queue to prevent users in debt
 * from booking new slots or entering queue.
 *
 * Data source: `user_debt_read_models` table in session-service DB.
 * This table is updated immediately upon receiving:
 *   - `wallet.arrears.created` -> hasOutstandingDebt = true
 *   - `wallet.arrears.cleared` -> hasOutstandingDebt = false
 *
 * No remote calls - check local DB -> ultra-low latency (< 1ms).
 */
@Injectable()
export class ArrearsGuard implements CanActivate {
  constructor(
    @InjectRepository(UserDebtReadModelOrmEntity)
    private readonly debtRepo: Repository<UserDebtReadModelOrmEntity>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip endpoints marked with @SkipArrearsCheck()
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ARREARS_CHECK, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const user    = request.user;

    // Not authenticated -> let JwtAuthGuard handle it first
    if (!user?.id) return true;

    const debt = await this.debtRepo.findOneBy({ userId: user.id });
    if (debt?.hasOutstandingDebt) {
      const formatted = Number(debt.arrearsAmount).toLocaleString('vi-VN');
      throw new ForbiddenException(
        `Your account has an outstanding debt of ${formatted} VND. ` +
        `Please top up your Wallet to settle the debt before booking or queuing.`,
      );
    }

    return true;
  }
}

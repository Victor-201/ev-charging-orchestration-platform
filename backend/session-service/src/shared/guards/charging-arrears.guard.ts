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
import { UserDebtReadModelOrmEntity } from '../../infrastructure/persistence/typeorm/entities/session.orm-entities';

export const SKIP_CHARGING_ARREARS = 'skipChargingArrearsCheck';

/**
 * @SkipChargingArrearsCheck() — Bỏ qua kiểm tra nợ xấu cho handler cụ thể.
 * Dùng cho GET endpoints (đọc lịch sử) hoặc admin/stop (nhân viên can thiệp sự cố).
 */
export const SkipChargingArrearsCheck = () => SetMetadata(SKIP_CHARGING_ARREARS, true);

/**
 * ChargingArrearsGuard — Chặn nợ xấu tại điểm sạc
 *
 * Bảo vệ POST /charging/start:
 * - User có hasOutstandingDebt = true → 403 Forbidden với hướng dẫn nạp tiền.
 * - Admin/Staff (admin/stop, telemetry) → bypass hoàn toàn qua @SkipChargingArrearsCheck().
 *
 * Không gọi remote service — check local DB (< 1ms latency).
 */
@Injectable()
export class ChargingArrearsGuard implements CanActivate {
  constructor(
    @InjectRepository(UserDebtReadModelOrmEntity)
    private readonly debtRepo: Repository<UserDebtReadModelOrmEntity>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CHARGING_ARREARS, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const user    = request.user;
    if (!user?.id) return true;

    // Admin/Staff được phép can thiệp kể cả khi đang nợ (vd: kết thúc session bị kẹt)
    if (user.roles?.some((r: string) => ['admin', 'staff'].includes(r))) return true;

    const debt = await this.debtRepo.findOneBy({ userId: user.id });
    if (debt?.hasOutstandingDebt) {
      const formatted = Number(debt.arrearsAmount).toLocaleString('vi-VN');
      throw new ForbiddenException(
        `Tài khoản đang có khoản nợ ${formatted} VND. ` +
        `Vui lòng nạp tiền vào Ví EV để thanh toán nợ trước khi tiếp tục sạc xe.`,
      );
    }

    return true;
  }
}

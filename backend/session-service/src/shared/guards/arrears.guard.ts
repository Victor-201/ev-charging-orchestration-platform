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
 * @SkipArrearsCheck() — Decorator bỏ qua kiểm tra nợ xấu cho handler cụ thể.
 * Dùng cho các endpoint GET (chỉ đọc) không cần block.
 */
export const SkipArrearsCheck = () => SetMetadata(SKIP_ARREARS_CHECK, true);

/**
 * ArrearsGuard — Chặn nợ xấu
 *
 * Áp dụng lên POST /bookings và POST /queue để ngăn user đang nợ tiền
 * đặt thêm chỗ mới hoặc vào hàng đợi.
 *
 * Nguồn dữ liệu: bảng `user_debt_read_models` trong booking-service DB.
 * Bảng này được cập nhật ngay lập tức khi nhận:
 *   - `wallet.arrears.created` → hasOutstandingDebt = true
 *   - `wallet.arrears.cleared` → hasOutstandingDebt = false
 *
 * Không gọi remote — check local DB → độ trễ cực thấp (< 1ms).
 */
@Injectable()
export class ArrearsGuard implements CanActivate {
  constructor(
    @InjectRepository(UserDebtReadModelOrmEntity)
    private readonly debtRepo: Repository<UserDebtReadModelOrmEntity>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Bỏ qua endpoint được đánh dấu @SkipArrearsCheck()
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ARREARS_CHECK, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const user    = request.user;

    // Chưa authenticate → để JwtAuthGuard xử lý trước
    if (!user?.id) return true;

    const debt = await this.debtRepo.findOneBy({ userId: user.id });
    if (debt?.hasOutstandingDebt) {
      const formatted = Number(debt.arrearsAmount).toLocaleString('vi-VN');
      throw new ForbiddenException(
        `Tài khoản đang có khoản nợ ${formatted} VND. ` +
        `Vui lòng nạp tiền vào Ví để thanh toán nợ trước khi đặt chỗ sạc hoặc vào hàng đợi.`,
      );
    }

    return true;
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import {
  UsersCacheOrmEntity, UserProfileOrmEntity, VehicleOrmEntity, VehicleModelOrmEntity,
  StaffProfileOrmEntity, AttendanceOrmEntity, SubscriptionOrmEntity,
  UserFcmTokenOrmEntity, ProcessedEventOrmEntity, OutboxOrmEntity,
  VehicleAuditLogOrmEntity, ProfileAuditLogOrmEntity,
  UserArrearsOrmEntity,
} from '../../infrastructure/persistence/typeorm/entities/user.orm-entities';
import { UserProfileRepository, UsersCacheRepository } from '../../infrastructure/persistence/typeorm/repositories/user-profile.repository';
import { VehicleRepository } from '../../infrastructure/persistence/typeorm/repositories/vehicle.repository';
import { OutboxEventBus, EVENT_BUS, OutboxPublisher } from '../../infrastructure/messaging/outbox/outbox.publisher';
import {
  GetMyProfileUseCase, UpdateMyProfileUseCase, GetVehiclesUseCase,
  AddVehicleUseCase, UpdateVehicleUseCase, DeleteVehicleUseCase,
  SetPrimaryVehicleUseCase, SyncUserCacheUseCase,
  SoftDeleteUserUseCase, GetProfileAuditLogUseCase, GetVehicleAuditLogUseCase,
} from '../../application/use-cases/user.use-cases';
import { UserController } from './user.controller';
import {
  USER_PROFILE_REPOSITORY, USERS_CACHE_REPOSITORY,
} from '../../domain/repositories/user-profile.repository.interface';
import { VEHICLE_REPOSITORY } from '../../domain/repositories/vehicle.repository.interface';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }   from '../../shared/guards/roles.guard';
import {
  WalletArrearsCreatedConsumer,
  WalletArrearsClearedConsumer,
} from '../../infrastructure/messaging/consumers/arrears.consumer';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      UsersCacheOrmEntity, UserProfileOrmEntity, VehicleOrmEntity, VehicleModelOrmEntity,
      StaffProfileOrmEntity, AttendanceOrmEntity, SubscriptionOrmEntity,
      UserFcmTokenOrmEntity, ProcessedEventOrmEntity, OutboxOrmEntity,
      VehicleAuditLogOrmEntity, ProfileAuditLogOrmEntity,
      UserArrearsOrmEntity,       // ─ ghi nhận chi tiết từng khoản nợ
    ]),
  ],
  controllers: [UserController],
  providers: [
    // Repositories
    { provide: USER_PROFILE_REPOSITORY, useClass: UserProfileRepository },
    { provide: USERS_CACHE_REPOSITORY, useClass: UsersCacheRepository },
    { provide: VEHICLE_REPOSITORY, useClass: VehicleRepository },
    // Event bus
    { provide: EVENT_BUS, useClass: OutboxEventBus },
    // Guards
    JwtAuthGuard,
    RolesGuard,
    // Use cases
    GetMyProfileUseCase, UpdateMyProfileUseCase, GetVehiclesUseCase,
    AddVehicleUseCase, UpdateVehicleUseCase, DeleteVehicleUseCase,
    SetPrimaryVehicleUseCase, SyncUserCacheUseCase,
    SoftDeleteUserUseCase, GetProfileAuditLogUseCase, GetVehicleAuditLogUseCase,
    // ─── Arrears Lock Consumers ──────────────────────────────────────────────
    WalletArrearsCreatedConsumer, // wallet.arrears.created → set cờ nợ + ghi user_arrears
    WalletArrearsClearedConsumer, // wallet.arrears.cleared → xóa cờ nợ
  ],
})
export class UserModule {}

import {
  Controller, Get, Patch, Post, Delete, Body, Param, HttpCode, HttpStatus,
  UseGuards, NotFoundException, BadRequestException, ParseUUIDPipe, Query,
} from '@nestjs/common';
import {
  GetMyProfileUseCase, UpdateMyProfileUseCase,
  GetVehiclesUseCase, AddVehicleUseCase, UpdateVehicleUseCase,
  DeleteVehicleUseCase, SetPrimaryVehicleUseCase,
  SoftDeleteUserUseCase, GetProfileAuditLogUseCase, GetVehicleAuditLogUseCase,
} from '../../application/use-cases/user.use-cases';
import { UpdateProfileDto } from '../../application/dtos/profile.dto';
import { AddVehicleDto, UpdateVehicleDto, AutoChargeSetupDto } from '../../application/dtos/vehicle.dto';
import {
  UserProfileNotFoundException, VehicleNotFoundException,
  DuplicatePlateNumberException, MaxVehiclesExceededException,
  VehicleOwnershipException, DomainException,
} from '../../domain/exceptions/user.exceptions';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }   from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(
    private readonly getProfileUC: GetMyProfileUseCase,
    private readonly updateProfileUC: UpdateMyProfileUseCase,
    private readonly getVehiclesUC: GetVehiclesUseCase,
    private readonly addVehicleUC: AddVehicleUseCase,
    private readonly updateVehicleUC: UpdateVehicleUseCase,
    private readonly deleteVehicleUC: DeleteVehicleUseCase,
    private readonly setPrimaryUC: SetPrimaryVehicleUseCase,
    private readonly softDeleteUserUC: SoftDeleteUserUseCase,
    private readonly getProfileAuditUC: GetProfileAuditLogUseCase,
    private readonly getVehicleAuditUC: GetVehicleAuditLogUseCase,
  ) {}

  // â”€â”€â”€ GET /users/me â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    try {
      return await this.getProfileUC.execute(user.id);
    } catch (e) {
      if (e instanceof UserProfileNotFoundException) throw new NotFoundException(e.message);
      throw e;
    }
  }

  // â”€â”€â”€ PATCH /users/me â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.updateProfileUC.execute(user.id, {
      avatarUrl: dto.avatarUrl,
      address: dto.address,
    });
  }

  // â”€â”€â”€ DELETE /users/me (soft delete) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(@CurrentUser() user: AuthenticatedUser) {
    await this.softDeleteUserUC.execute(user.id);
  }

  // â”€â”€â”€ GET /users/me/audit-log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('me/audit-log')
  async myProfileAuditLog(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    return this.getProfileAuditUC.execute(user.id, limit ? parseInt(limit) : 20);
  }

  // â”€â”€â”€ GET /users/me/vehicles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('me/vehicles')
  async myVehicles(@CurrentUser() user: AuthenticatedUser) {
    return this.getVehiclesUC.execute(user.id);
  }

  // â”€â”€â”€ POST /users/me/vehicles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Post('me/vehicles')
  @HttpCode(HttpStatus.CREATED)
  async addMyVehicle(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddVehicleDto,
  ) {
    try {
      return await this.addVehicleUC.execute(user.id, {
        brand: dto.brand,
        modelName: dto.modelName,
        year: dto.year,
        plateNumber: dto.plateNumber,
        color: dto.color,
        batteryCapacityKwh: dto.batteryCapacityKwh,
        usableCapacityKwh: dto.usableCapacityKwh,
        defaultChargePort: dto.defaultChargePort,
        maxAcPowerKw: dto.maxAcPowerKw,
        maxDcPowerKw: dto.maxDcPowerKw,
      });
    } catch (e) {
      if (e instanceof DuplicatePlateNumberException) throw new BadRequestException(e.message);
      if (e instanceof MaxVehiclesExceededException) throw new BadRequestException(e.message);
      if (e instanceof DomainException) throw new BadRequestException(e.message);
      throw e;
    }
  }

  // â”€â”€â”€ PATCH /users/me/vehicles/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Patch('me/vehicles/:id')
  async updateMyVehicle(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) vehicleId: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    try {
      return await this.updateVehicleUC.execute(user.id, vehicleId, { color: dto.color });
    } catch (e) {
      if (e instanceof VehicleNotFoundException) throw new NotFoundException(e.message);
      if (e instanceof VehicleOwnershipException) throw new NotFoundException('Vehicle not found');
      throw e;
    }
  }

  // â”€â”€â”€ DELETE /users/me/vehicles/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Delete('me/vehicles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMyVehicle(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) vehicleId: string,
  ) {
    try {
      await this.deleteVehicleUC.execute(user.id, vehicleId);
    } catch (e) {
      if (e instanceof VehicleNotFoundException) throw new NotFoundException(e.message);
      if (e instanceof VehicleOwnershipException) throw new NotFoundException('Vehicle not found');
      throw e;
    }
  }

  // â”€â”€â”€ PATCH /users/me/vehicles/:id/primary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Patch('me/vehicles/:id/primary')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setMyPrimaryVehicle(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) vehicleId: string,
  ) {
    try {
      await this.setPrimaryUC.execute(user.id, vehicleId);
    } catch (e) {
      if (e instanceof VehicleNotFoundException) throw new NotFoundException(e.message);
      if (e instanceof VehicleOwnershipException) throw new NotFoundException('Vehicle not found');
      throw e;
    }
  }

  // â”€â”€â”€ GET /users/me/vehicles/:id/audit-log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('me/vehicles/:id/audit-log')
  async vehicleAuditLog(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) vehicleId: string,
    @Query('limit') limit?: string,
  ) {
    return this.getVehicleAuditUC.execute(vehicleId, user.id, limit ? parseInt(limit) : 20);
  }

  // â”€â”€â”€ PATCH /users/me/vehicles/:id/autocharge-setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Cáº¥u hÃ¬nh tÃ­nh nÄƒng "Cáº¯m lÃ  Sáº¡c" cho xe.
   * User cung cáº¥p MAC address + báº­t autocharge_enabled = true.
   * OCPP Gateway sáº½ dÃ¹ng MAC Ä‘á»ƒ nháº­n diá»‡n xe vÃ  tá»± start session.
   */
  @Patch('me/vehicles/:id/autocharge-setup')
  async setupAutocharge(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) vehicleId: string,
    @Body() dto: AutoChargeSetupDto,
  ) {
    const updateFields: string[] = [];
    const params: (string | boolean | null)[] = [vehicleId, user.id];

    if (dto.macAddress !== undefined) {
      params.push(dto.macAddress ?? null);
      updateFields.push(`mac_address = $${params.length}`);
    }
    if (dto.vinNumber !== undefined) {
      params.push(dto.vinNumber ?? null);
      updateFields.push(`vin_number = $${params.length}`);
    }
    if (dto.autochargeEnabled !== undefined) {
      params.push(dto.autochargeEnabled);
      updateFields.push(`autocharge_enabled = $${params.length}`);
    }

    if (updateFields.length === 0) {
      throw new BadRequestException('KhÃ´ng cÃ³ giÃ¡ trá»‹ nÃ o Ä‘Æ°á»£c cung cáº¥p');
    }

    return { message: 'AutoCharge setup Ä‘Ã£ Ä‘Æ°á»£c cáº­p nháº­t', vehicleId };
  }
}

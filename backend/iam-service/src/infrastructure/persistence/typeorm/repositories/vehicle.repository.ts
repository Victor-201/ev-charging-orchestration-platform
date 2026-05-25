import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Vehicle, VehicleModelInfo, VehicleStatus } from '../../../../domain/entities/vehicle.aggregate';
import { IVehicleRepository } from '../../../../domain/repositories/vehicle.repository.interface';
import { VehicleOrmEntity, VehicleModelOrmEntity } from '../entities/user.orm-entities';
import { DuplicateMacAddressException, DuplicateVinNumberException } from '../../../../domain/exceptions/user.exceptions';

@Injectable()
export class VehicleRepository implements IVehicleRepository {
  constructor(
    @InjectRepository(VehicleOrmEntity)
    private readonly repo: Repository<VehicleOrmEntity>,
    @InjectRepository(VehicleModelOrmEntity)
    private readonly modelRepo: Repository<VehicleModelOrmEntity>,
  ) {}

  private modelToDomain(e: VehicleModelOrmEntity): VehicleModelInfo {
    return {
      id: e.id,
      brand: e.brand,
      modelName: e.modelName,
      year: e.year,
      batteryCapacityKwh: e.batteryCapacityKwh,
      usableCapacityKwh: e.usableCapacityKwh,
      defaultChargePort: e.defaultChargePort,
      maxAcPowerKw: e.maxAcPowerKw,
      maxDcPowerKw: e.maxDcPowerKw,
    };
  }

  private vehicleToDomain(e: VehicleOrmEntity, model?: VehicleModelInfo): Vehicle {
    return Vehicle.reconstitute({
      id: e.id,
      ownerId: e.ownerId,
      modelId: e.modelId,
      plateNumber: e.plateNumber,
      color: e.color,
      status: e.status as VehicleStatus,
      isPrimary: e.isPrimary,
      macAddress: e.macAddress,
      vinNumber: e.vinNumber,
      autochargeEnabled: e.autochargeEnabled,
      version: e.version,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      model,
    });
  }

  private vehicleToOrm(vehicle: Vehicle): Partial<VehicleOrmEntity> {
    return {
      id: vehicle.id,
      ownerId: vehicle.ownerId,
      modelId: vehicle.modelId,
      plateNumber: vehicle.plateNumber,
      color: vehicle.color,
      status: vehicle.status,
      isPrimary: vehicle.isPrimary,
      macAddress: vehicle.macAddress,
      vinNumber: vehicle.vinNumber,
      autochargeEnabled: vehicle.autochargeEnabled,
      version: vehicle.version,
    };
  }

  async findById(id: string): Promise<Vehicle | null> {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) return null;
    const model = await this.findModelById(e.modelId);
    return this.vehicleToDomain(e, model ?? undefined);
  }

  async findByOwnerId(ownerId: string): Promise<Vehicle[]> {
    const entities = await this.repo.find({
      where: { ownerId, status: 'active' },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
    return Promise.all(
      entities.map(async (e) => {
        const model = await this.findModelById(e.modelId);
        return this.vehicleToDomain(e, model ?? undefined);
      }),
    );
  }

  async findByPlate(plateNumber: string): Promise<Vehicle | null> {
    const e = await this.repo.findOne({
      where: { plateNumber: plateNumber.toUpperCase() },
    });
    return e ? this.vehicleToDomain(e) : null;
  }

  async save(vehicle: Vehicle): Promise<void> {
    try {
      await this.repo.save(this.vehicleToOrm(vehicle) as VehicleOrmEntity);
    } catch (e) {
      if (e instanceof QueryFailedError) {
        const error = e as any;
        if (error.code === '23505') { // postgres unique_violation code
          if (error.detail?.includes('mac_address')) {
            throw new DuplicateMacAddressException(vehicle.macAddress ?? '');
          }
          if (error.detail?.includes('vin_number')) {
            throw new DuplicateVinNumberException(vehicle.vinNumber ?? '');
          }
        }
      }
      throw e;
    }
  }

  async unsetPrimaryForUser(ownerId: string): Promise<void> {
    await this.repo.update({ ownerId, isPrimary: true }, { isPrimary: false });
  }

  async findModelById(modelId: string): Promise<VehicleModelInfo | null> {
    const e = await this.modelRepo.findOne({ where: { id: modelId } });
    return e ? this.modelToDomain(e) : null;
  }

  async findModelBySpecs(brand: string, modelName: string, year: number): Promise<VehicleModelInfo | null> {
    const e = await this.modelRepo.findOne({ where: { brand, modelName, year } });
    return e ? this.modelToDomain(e) : null;
  }

  async saveModel(model: Omit<VehicleModelInfo, 'id'> & { id: string }): Promise<VehicleModelInfo> {
    const e = this.modelRepo.create({
      id: model.id,
      brand: model.brand,
      modelName: model.modelName,
      year: model.year,
      batteryCapacityKwh: model.batteryCapacityKwh,
      usableCapacityKwh: model.usableCapacityKwh,
      defaultChargePort: model.defaultChargePort,
      maxAcPowerKw: model.maxAcPowerKw,
      maxDcPowerKw: model.maxDcPowerKw,
    });
    const saved = await this.modelRepo.save(e);
    return this.modelToDomain(saved);
  }

  async countActiveByOwner(ownerId: string): Promise<number> {
    return this.repo.count({ where: { ownerId, status: 'active' } });
  }
}

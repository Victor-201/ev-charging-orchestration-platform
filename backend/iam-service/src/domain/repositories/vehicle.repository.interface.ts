import { Vehicle, VehicleModelInfo } from '../entities/vehicle.aggregate';

export interface CreateVehicleData {
  ownerId: string;
  modelId: string;
  plateNumber: string;
  color?: string;
}

export interface IVehicleRepository {
  findById(id: string): Promise<Vehicle | null>;
  findByOwnerId(ownerId: string): Promise<Vehicle[]>;
  findByPlate(plateNumber: string): Promise<Vehicle | null>;
  save(vehicle: Vehicle): Promise<void>;
  unsetPrimaryForUser(ownerId: string): Promise<void>;
  findModelById(modelId: string): Promise<VehicleModelInfo | null>;
  findModelBySpecs(brand: string, modelName: string, year: number): Promise<VehicleModelInfo | null>;
  saveModel(model: Omit<VehicleModelInfo, 'id'> & { id: string }): Promise<VehicleModelInfo>;
  countActiveByOwner(ownerId: string): Promise<number>;
}
export const VEHICLE_REPOSITORY = Symbol('VEHICLE_REPOSITORY');

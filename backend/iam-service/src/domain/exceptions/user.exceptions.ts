export class DomainException extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'DomainException';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UserProfileNotFoundException extends DomainException {
  constructor(userId: string) {
    super(`User profile not found for user: ${userId}`, 'USER_PROFILE_NOT_FOUND');
  }
}

export class VehicleNotFoundException extends DomainException {
  constructor(vehicleId: string) {
    super(`Vehicle not found: ${vehicleId}`, 'VEHICLE_NOT_FOUND');
  }
}

export class DuplicatePlateNumberException extends DomainException {
  constructor(plate: string) {
    super(`License plate '${plate}' is already registered`, 'DUPLICATE_PLATE_NUMBER');
  }
}

export class VehicleOwnershipException extends DomainException {
  constructor() {
    super('Vehicle does not belong to this user', 'VEHICLE_OWNERSHIP_VIOLATION');
  }
}

export class MaxVehiclesExceededException extends DomainException {
  constructor(max: number) {
    super(`Maximum ${max} vehicles allowed per user`, 'MAX_VEHICLES_EXCEEDED');
  }
}

export class InvalidVehicleModelException extends DomainException {
  constructor() {
    super('Vehicle model not found or invalid', 'INVALID_VEHICLE_MODEL');
  }
}

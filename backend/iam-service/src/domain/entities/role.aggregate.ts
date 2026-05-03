/**
 * Role Aggregate — auth-service RBAC bounded context
 * Aligned với: auth_db.sql roles, permissions, role_permissions tables
 */
export interface Permission {
  id: string;
  name: string;       // format: resource:action
  resource: string;
  action: string;
  description?: string;
}

export class Role {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly isSystem: boolean;
  readonly createdAt: Date;
  private _permissions: Permission[];

  private constructor(props: {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    permissions: Permission[];
    createdAt?: Date;
  }) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.isSystem = props.isSystem;
    this._permissions = [...props.permissions];
    this.createdAt = props.createdAt ?? new Date();
  }

  static create(props: {
    name: string;
    description?: string;
    isSystem?: boolean;
  }): Role {
    return new Role({
      id: crypto.randomUUID(),
      name: props.name.toLowerCase().trim(),
      description: props.description ?? null,
      isSystem: props.isSystem ?? false,
      permissions: [],
    });
  }

  static reconstitute(props: {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    permissions: Permission[];
    createdAt: Date;
  }): Role {
    return new Role(props);
  }

  hasPermission(resource: string, action: string): boolean {
    return this._permissions.some(
      (p) => p.resource === resource && p.action === action,
    );
  }

  hasPermissionByName(permissionName: string): boolean {
    return this._permissions.some((p) => p.name === permissionName);
  }

  get permissions(): Permission[] { return [...this._permissions]; }
}

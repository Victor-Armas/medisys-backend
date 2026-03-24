import { SetMetadata } from '@nestjs/common';

// La llave con la que guardamos y leemos la metadata
export const ROLES_KEY = 'roles';

// @Roles('ADMIN_SISTEMA', 'ADMIN_CONSULTORIO')
// Esto adjunta los roles permitidos al endpoint como metadata
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

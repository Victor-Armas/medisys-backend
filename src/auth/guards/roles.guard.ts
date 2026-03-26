import { ROLES_KEY } from '@auth/decorators/roles.decorator';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Leer los roles requeridos del decorador @Roles()
    // Si el endpoint no tiene @Roles(), cualquiera puede pasar
    const rolesRequest = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!rolesRequest) return true;
    // 2. Obtener el usuario del request
    // JwtAuthGuard ya lo puso ahí antes de que este guard se ejecute

    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: string };
    // 3. Verificar si el rol del usuario está en la lista de roles permitidos
    if (!user || !user.role) {
      throw new ForbiddenException('No se pudo determinar tu nivel de acceso.');
    }

    // 4. Verificamos si el rol es el permitido
    const hasRole = rolesRequest.includes(user.role);

    if (!hasRole) {
      // Mensaje de paciente o staff sin permiso
      throw new ForbiddenException(
        'No tienes los permisos necesarios para realizar esta acción.',
      );
    }

    return rolesRequest.includes(user.role);
  }
}

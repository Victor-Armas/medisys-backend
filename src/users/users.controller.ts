import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '@auth/decorators/roles.decorator';
import { CreateUserDTO } from './dto/create-user.dto';
import { RequestWithUser } from '@auth/auth.controller';

@Controller('users')
// Ambos guards se aplican a todos los endpoints de este controller
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR')
  create(@Body() dto: CreateUserDTO) {
    // El controller solo delega — la lógica vive en el service
    return this.usersService.create(dto);
  }

  // ─────────────────────────────────────────────────────────────
  // GET /api/users
  // Lista todos los usuarios activos excepto doctores.
  // Solamente se listan los que tienen el rol de
  // ─────────────────────────────────────────────────────────────

  @Get()
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR', 'RECEPTIONIST')
  findAll(@Req() req: RequestWithUser) {
    return this.usersService.findAll(req.user.role);
  }

  // ─────────────────────────────────────────────────────────────
  // GET /api/users/:id
  // Devuelve un usuario específico por su userId. (no doctores ni main doctor)
  // ParseUUIDPipe valida el formato del UUID antes de llegar
  // al servicio — si no es un UUID válido devuelve 400 automático.
  // ─────────────────────────────────────────────────────────────
  @Get(':id')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR', 'RECEPTIONIST', 'PATIENT')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }
}

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
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDTO } from './dto/create-doctor.dto';
import { AssignDoctorProfileDTO } from './dto/assign-doctor-profile.dto';
import { RequestWithUser } from '@auth/auth.controller';

// Agrupa los endpoints en Swagger bajo "Doctors", no afecta la logica
@ApiTags('Doctors')
// ─────────────────────────────────────────────────────────────
// Todos los endpoints de este controller requieren:
//   1. JWT válido        — JwtAuthGuard
//   2. Rol autorizado    — RolesGuard + @Roles()
// No hay endpoints públicos en este módulo.
// ─────────────────────────────────────────────────────────────

@Controller('doctors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DoctorsController {
  constructor(private doctorsService: DoctorsService) {}

  // ─────────────────────────────────────────────────────────────
  // POST /api/doctors
  // Crea un usuario nuevo + perfil médico en una sola operación.
  // Solo ADMIN_SYSTEM puede crear doctores desde cero.
  // Service: createFull
  // ─────────────────────────────────────────────────────────────

  @Post()
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR')
  create(@Body() dto: CreateDoctorDTO) {
    return this.doctorsService.createFull(dto);
  }

  // ─────────────────────────────────────────────────────────────
  // POST /api/doctors/assign
  // Asigna un perfil médico a un usuario ya existente.
  // Caso de uso ejemplo: convertir un recepcionista en doctor,
  // o completar el perfil de alguien ya registrado.
  // Solo ADMIN_SYSTEM y MAIN_DOCTOR puede hacer esta operación.
  // ─────────────────────────────────────────────────────────────

  @Post('assign')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR')
  assign(@Body() dto: AssignDoctorProfileDTO) {
    return this.doctorsService.assignProfile(dto);
  }

  // ─────────────────────────────────────────────────────────────
  // GET /api/doctors
  // Lista todos los médicos activos con sus consultorios.
  // Solamente se listan los que tienen el rol de
  // 'MAIN_DOCTOR', 'DOCTOR'
  // ─────────────────────────────────────────────────────────────

  @Get()
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR', 'RECEPTIONIST', 'PATIENT')
  findAll(@Req() req: RequestWithUser) {
    return this.doctorsService.findAll(req.user.role);
  }
  // ─────────────────────────────────────────────────────────────
  // GET /api/doctors/:id
  // Devuelve un médico específico por su userId.
  // ParseUUIDPipe valida el formato del UUID antes de llegar
  // al servicio — si no es un UUID válido devuelve 400 automático.
  // ─────────────────────────────────────────────────────────────
  @Get(':id')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR', 'RECEPTIONIST', 'PATIENT')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.doctorsService.findOne(id);
  }
}

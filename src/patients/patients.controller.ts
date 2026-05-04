import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { PatientsService } from './patients.service';
import { CreatePatientDTO } from './dto/create-patient.dto';
import { UpdatePatientDTO } from './dto/update-patient.dto';
import { CreateMedicalHistoryDTO } from './dto/create-medical-history.dto';
import { CreatePatientAddressDTO } from './dto/create-patient-address.dto';

// Todos los roles de staff tienen acceso a los pacientes.
// La diferencia entre roles se aplica en el servicio donde sea necesario.
const ALL_STAFF = [
  'ADMIN_SYSTEM',
  'MAIN_DOCTOR',
  'DOCTOR',
  'RECEPTIONIST',
] as const;
const DOCTORS = ['ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR'] as const;
const ADMIN = ['ADMIN_SYSTEM', 'MAIN_DOCTOR'] as const;

@ApiTags('Patients')
@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  // ── POST /api/patients — Crear paciente (recepción o médico) ──────────────
  @Post()
  @Roles(...ALL_STAFF)
  create(@Body() dto: CreatePatientDTO) {
    return this.patientsService.create(dto);
  }

  // ── GET /api/patients — Listar pacientes (paginado, buscable) ─────────────
  @Get()
  @Roles(...ALL_STAFF)
  findAll(
    @Query('clinicId') clinicId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.patientsService.findAll({
      clinicId,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('search/clinical')
  @Roles(...ALL_STAFF)
  searchClinical(
    @Query('clinicId') clinicId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.patientsService.findAll({
      clinicId,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      includeAllergies: true, // 👈 aquí activas el extra
    });
  }

  // ── GET /api/patients/:id — Detalle del paciente ──────────────────────────
  @Get(':id')
  @Roles(...ALL_STAFF)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientsService.findOne(id);
  }

  // ── PATCH /api/patients/:id — Editar datos del paciente ───────────────────
  @Patch(':id')
  @Roles(...ALL_STAFF)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDTO,
  ) {
    return this.patientsService.update(id, dto);
  }

  // ── POST /api/patients/:id/medical-history ─────────────────────────────────
  @Post(':id/medical-history')
  @Roles(...DOCTORS)
  createMedicalHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMedicalHistoryDTO,
  ) {
    return this.patientsService.createMedicalHistory(id, dto);
  }

  // ── GET /api/patients/:id/medical-history ─────────────────────────────────
  @Get(':id/medical-history')
  @Roles(...DOCTORS)
  getMedicalHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientsService.getMedicalHistory(id);
  }

  // ── PATCH /api/patients/:id/medical-history ───────────────────────────────
  // Solo admin/main pueden corregir una historia clínica ya creada
  @Patch(':id/medical-history')
  @Roles(...DOCTORS)
  updateMedicalHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMedicalHistoryDTO,
  ) {
    return this.patientsService.updateMedicalHistory(id, dto);
  }

  // ── POST /api/patients/:id/addresses ──────────────────────────────────────
  @Post(':id/addresses')
  @Roles(...ALL_STAFF)
  addAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePatientAddressDTO,
  ) {
    return this.patientsService.addAddress(id, dto);
  }

  // ── PATCH /api/patients/:id/addresses/:addressId ──────────────────────────
  @Patch(':id/addresses/:addressId')
  @Roles(...ALL_STAFF)
  updateAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() dto: CreatePatientAddressDTO,
  ) {
    return this.patientsService.updateAddress(id, addressId, dto);
  }

  // ── POST /api/patients/:id/clinics ────────────────────────────────────────
  @Post(':id/clinics')
  @Roles(...ADMIN)
  assignToClinic(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('clinicId') clinicId: string,
  ) {
    return this.patientsService.assignToClinic(id, clinicId);
  }
}

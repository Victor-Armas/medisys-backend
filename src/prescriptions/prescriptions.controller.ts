// src/prescriptions/prescriptions.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDTO } from './dto/create-prescription.dto';
import { UpdatePrescriptionDTO } from './dto/update-prescription.dto';

const CLINICAL = ['ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR'] as const;
const ALL_STAFF = [
  'ADMIN_SYSTEM',
  'MAIN_DOCTOR',
  'DOCTOR',
  'RECEPTIONIST',
] as const;

@ApiTags('Prescriptions')
@Controller('prescriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  /**
   * POST /api/prescriptions
   * Crea una receta en DRAFT para una consulta.
   * Solo médicos y admins pueden crear recetas.
   */
  @Post()
  @Roles(...CLINICAL)
  create(@Body() dto: CreatePrescriptionDTO) {
    return this.prescriptionsService.create(dto);
  }

  /**
   * GET /api/prescriptions/:id
   * Detalle completo de la receta (datos del médico + ítems).
   */
  @Get(':id')
  @Roles(...ALL_STAFF)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.prescriptionsService.findOne(id);
  }

  /**
   * GET /api/prescriptions/patient/:patientId
   * Todas las recetas de un paciente (historial farmacológico).
   */
  @Get('patient/:patientId')
  @Roles(...ALL_STAFF)
  findByPatient(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.prescriptionsService.findByPatient(patientId);
  }

  /**
   * PATCH /api/prescriptions/:id
   * Reemplaza los ítems de una receta en DRAFT.
   */
  @Patch(':id')
  @Roles(...CLINICAL)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePrescriptionDTO,
  ) {
    return this.prescriptionsService.update(id, dto);
  }

  /**
   * POST /api/prescriptions/:id/issue
   * Emite la receta (DRAFT → ISSUED).
   * En Fase 5 esto generará el PDF y lo subirá a Cloudinary.
   */
  @Post(':id/issue')
  @Roles(...CLINICAL)
  issue(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('includeSignature') includeSignature?: boolean,
  ) {
    return this.prescriptionsService.issue(id, includeSignature ?? true);
  }

  /**
   * POST /api/prescriptions/:id/cancel
   * Cancela la receta (cualquier estado → CANCELLED).
   */
  @Post(':id/cancel')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.prescriptionsService.cancel(id);
  }
}

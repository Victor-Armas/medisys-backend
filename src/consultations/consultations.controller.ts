// src/consultations/consultations.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { RequestWithUser } from '@auth/auth.controller';
import { ConsultationsService } from './consultations.service';
import {
  CreateConsultationDTO,
  CreateDiagnosisDTO,
} from './dto/create-consultation.dto';
import { UpdateConsultationDTO } from './dto/update-consultation.dto';
import { ListConsultationsDTO } from './dto/list-consultations.dto';

// Solo personal clínico accede al expediente
const CLINICAL = ['ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR'] as const;
const ALL_STAFF = [
  'ADMIN_SYSTEM',
  'MAIN_DOCTOR',
  'DOCTOR',
  'RECEPTIONIST',
] as const;

@ApiTags('Consultations')
@Controller('consultations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  /**
   * POST /api/consultations
   * Crea una consulta completa (signos vitales + diagnósticos en una sola llamada).
   * Solo médicos y admins pueden iniciar una consulta.
   */
  @Post()
  @Roles(...CLINICAL)
  create(@Body() dto: CreateConsultationDTO, @Req() req: RequestWithUser) {
    return this.consultationsService.create(dto, req.user.id, req.user.role);
  }

  /**
   * GET /api/consultations
   * Lista consultas con filtros opcionales.
   * Los doctores automáticamente ven solo las suyas.
   */
  @Get()
  @Roles(...ALL_STAFF)
  findAll(@Query() query: ListConsultationsDTO, @Req() req: RequestWithUser) {
    return this.consultationsService.findAll(query, req.user.id, req.user.role);
  }

  /**
   * GET /api/consultations/:id
   * Detalle completo de una consulta (expediente + receta).
   */
  @Get(':id')
  @Roles(...ALL_STAFF)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) {
    return this.consultationsService.findOne(id, req.user.id, req.user.role);
  }

  /**
   * GET /api/consultations/patient/:patientId
   * Historial clínico completo de un paciente.
   */
  @Get('patient/:patientId')
  @Roles(...ALL_STAFF)
  findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.consultationsService.findByPatient(
      patientId,
      req.user.id,
      req.user.role,
    );
  }

  /**
   * PATCH /api/consultations/:id
   * Edita la nota de evolución (mientras la receta no esté emitida).
   */
  @Patch(':id')
  @Roles(...CLINICAL)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConsultationDTO,
    @Req() req: RequestWithUser,
  ) {
    return this.consultationsService.update(
      id,
      dto,
      req.user.id,
      req.user.role,
    );
  }

  /**
   * POST /api/consultations/:id/diagnoses
   * Agrega un diagnóstico a una consulta existente.
   */
  @Post(':id/diagnoses')
  @Roles(...CLINICAL)
  addDiagnosis(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDiagnosisDTO,
    @Req() req: RequestWithUser,
  ) {
    return this.consultationsService.addDiagnosis(
      id,
      dto,
      req.user.id,
      req.user.role,
    );
  }

  /**
   * DELETE /api/consultations/:id/diagnoses/:diagnosisId
   * Elimina un diagnóstico de la consulta.
   */
  @Delete(':id/diagnoses/:diagnosisId')
  @Roles(...CLINICAL)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDiagnosis(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('diagnosisId', ParseUUIDPipe) diagnosisId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.consultationsService.removeDiagnosis(
      id,
      diagnosisId,
      req.user.id,
      req.user.role,
    );
  }

  /**
   * GET /api/consultations/suggestions?icd10=J00&icd10=E11
   * Retorna medicamentos sugeridos para uno o varios códigos ICD-10.
   * Ordenados por prioridad + usageCount (aprendizaje con el uso).
   */
  @Get('suggestions')
  @Roles(...CLINICAL)
  getSuggestions(@Query('icd10') icd10: string | string[]) {
    const codes = Array.isArray(icd10) ? icd10 : [icd10].filter(Boolean);
    return this.consultationsService.getMedicationSuggestions(codes);
  }
}

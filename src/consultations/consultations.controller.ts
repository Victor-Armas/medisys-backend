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
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
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
import { ConsultationTimelineQueryDTO } from './dto/consultation-timeline.dto';
import { PdfService } from 'src/pdf/pdf.service';
import { ConsultationNoteTemplateProps } from 'src/pdf/templates/consultation-note';

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
  constructor(
    private readonly consultationsService: ConsultationsService,
    private readonly pdfService: PdfService,
  ) {}

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
   * GET /api/consultations/patient/:patientId/timeline
   * Timeline: consultations + medical files linked to each consultation.
   */
  @Get('patient/:patientId/timeline')
  @Roles(...ALL_STAFF)
  timelineByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: ConsultationTimelineQueryDTO,
    @Req() req: RequestWithUser,
  ) {
    return this.consultationsService.findTimelineByPatient(
      patientId,
      query,
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

  @Get(':id/pdf')
  @Roles(...CLINICAL)
  async generateNotePdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('signature') signature: string,
    @Res() res: Response,
    @Req() req: RequestWithUser,
  ) {
    const c = await this.consultationsService.findOne(
      id,
      req.user.id,
      req.user.role,
    );
    const doctor = c.doctorClinic.doctorProfile.user;
    const clinic = c.doctorClinic.clinic;

    const age =
      new Date().getFullYear() - new Date(c.patient.birthDate).getFullYear();

    const props: ConsultationNoteTemplateProps = {
      clinicName: clinic?.name ?? 'Consultorio',
      clinicAddress: clinic?.address ?? null,
      clinicPhone: clinic?.phone ?? null,
      clinicLogoUrl: clinic?.logoUrl ?? null,
      doctorName: `${doctor.firstName} ${doctor.lastNamePaternal}`,
      doctorLicense: c.doctorClinic.doctorProfile.professionalLicense ?? '',
      doctorSpecialty: c.doctorClinic.doctorProfile.specialty ?? null,
      doctorSignatureUrl: c.doctorClinic.doctorProfile.signatureUrl ?? null,
      includeSignature: signature === 'true',
      patientName: `${c.patient.firstName} ${c.patient.lastNamePaternal}`,
      patientAge: age,
      patientGender: c.patient.gender,
      patientCurp: c.patient.curp ?? null,
      patientBloodType: c.patient.bloodType ?? null,
      patientAllergies: c.patient.allergies?.map((a) => a.substance) ?? [],
      folioNumber: c.folioNumber,
      consultedAt: c.consultedAt.toISOString(),
      consultationType: c.consultationType,
      reasonForVisit: c.reasonForVisit,
      currentCondition: c.currentCondition ?? '',
      physicalExamFindings: c.physicalExamFindings ?? null,
      labResultsSummary: c.labResultsSummary ?? null,
      clinicalImpressions: c.clinicalImpressions ?? null,
      treatmentPlan: c.treatmentPlan ?? null,
      patientInstructions: c.patientInstructions ?? null,
      prognosis: c.prognosis ?? null,
      requiresFollowUp: c.requiresFollowUp ?? false,
      followUpDays: c.followUpDays ?? null,
      vitalSigns: c.vitalSigns ?? null,
      diagnoses: c.diagnoses,
    };

    const buffer = await this.pdfService.generateConsultationNote(props);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="nota-${c.folioNumber}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}

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
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { PatientMedicationsService } from './patient-medications.service';
import {
  CreateMedicationDTO,
  UpdateMedicationDTO,
} from './create-medication.dto';

const CLINICAL = ['ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR'] as const;
const ALL_STAFF = [
  'ADMIN_SYSTEM',
  'MAIN_DOCTOR',
  'DOCTOR',
  'RECEPTIONIST',
] as const;

@ApiTags('Patient Medications')
@Controller('patients/:patientId/medications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientMedicationsController {
  constructor(private readonly service: PatientMedicationsService) {}

  @Post()
  @Roles(...CLINICAL)
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateMedicationDTO,
  ) {
    return this.service.create(patientId, dto);
  }

  @Get()
  @Roles(...ALL_STAFF)
  findAll(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.service.findAll(patientId);
  }

  @Patch(':medicationId')
  @Roles(...CLINICAL)
  update(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @Body() dto: UpdateMedicationDTO,
  ) {
    return this.service.update(patientId, medicationId, dto);
  }

  @Delete(':medicationId')
  @Roles(...CLINICAL)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
  ) {
    return this.service.remove(patientId, medicationId);
  }
}

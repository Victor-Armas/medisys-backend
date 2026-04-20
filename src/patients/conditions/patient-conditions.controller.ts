// ─── src/patients/conditions/patient-conditions.controller.ts ────────────────
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
import { PatientConditionsService } from './patient-conditions.service';
import { CreateConditionDTO } from './dto/create-condition.dto';
import { IsOptional, IsString, MaxLength } from 'class-validator';

const ALL_STAFF = [
  'ADMIN_SYSTEM',
  'MAIN_DOCTOR',
  'DOCTOR',
  'RECEPTIONIST',
] as const;
const CLINICAL = ['ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR'] as const;

class UpdateConditionNotesDTO {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

@ApiTags('Patient Conditions')
@Controller('patients/:patientId/conditions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientConditionsController {
  constructor(private readonly service: PatientConditionsService) {}

  @Post()
  @Roles(...CLINICAL)
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateConditionDTO,
  ) {
    return this.service.create(patientId, dto);
  }

  @Get()
  @Roles(...ALL_STAFF)
  findAll(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.service.findAll(patientId);
  }

  @Patch(':conditionId/notes')
  @Roles(...CLINICAL)
  updateNotes(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('conditionId', ParseUUIDPipe) conditionId: string,
    @Body() dto: UpdateConditionNotesDTO,
  ) {
    return this.service.updateNotes(patientId, conditionId, dto.notes ?? null);
  }

  @Delete(':conditionId')
  @Roles(...CLINICAL)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('conditionId', ParseUUIDPipe) conditionId: string,
  ) {
    return this.service.remove(patientId, conditionId);
  }
}

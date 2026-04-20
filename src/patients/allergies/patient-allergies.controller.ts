import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { PatientAllergiesService } from './patient-allergies.service';
import { CreateAllergyDTO } from './dto/create-allergy.dto';

@ApiTags('Patient Allergies')
@Controller('patients/:patientId/allergies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientAllergiesController {
  constructor(private readonly service: PatientAllergiesService) {}

  @Post()
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR')
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateAllergyDTO,
  ) {
    return this.service.create(patientId, dto);
  }

  @Get()
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR', 'RECEPTIONIST')
  findAll(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.service.findAll(patientId);
  }

  @Delete(':allergyId')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('allergyId', ParseUUIDPipe) allergyId: string,
  ) {
    return this.service.remove(patientId, allergyId);
  }
}

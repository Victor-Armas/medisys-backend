import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { RequestWithUser } from '@auth/auth.controller';
import { ClinicsService } from './clinics.service';
import { CreateClinicDTO } from './dto/create-clinic.dto';
import { UpdateClinicDTO } from './dto/update-clinic.dto';
import { CreateScheduleDTO } from './dto/create-schedule.dto';

@ApiTags('Clinics')
@Controller('clinics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicsController {
  constructor(private clinicsService: ClinicsService) {}

  // POST /api/clinics
  @Post()
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR')
  create(@Body() dto: CreateClinicDTO) {
    return this.clinicsService.create(dto);
  }

  // GET /api/clinics
  @Get()
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR', 'RECEPTIONIST')
  findAll(@Req() req: RequestWithUser) {
    return this.clinicsService.findAll(req.user.role);
  }

  // GET /api/clinics/:id
  @Get(':id')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR', 'RECEPTIONIST')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clinicsService.findOne(id);
  }

  // PATCH /api/clinics/:id
  @Patch(':id')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClinicDTO) {
    return this.clinicsService.update(id, dto);
  }

  // PATCH /api/clinics/:id/toggle
  @Patch(':id/toggle')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR')
  toggle(@Param('id', ParseUUIDPipe) id: string) {
    return this.clinicsService.toggle(id);
  }

  // POST /api/clinics/schedules
  @Post('schedules')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR')
  addSchedule(@Body() dto: CreateScheduleDTO, @Req() req: RequestWithUser) {
    return this.clinicsService.addSchedule(dto, req.user.id, req.user.role);
  }

  // DELETE /api/clinics/schedules/:scheduleId
  @Delete('schedules/:scheduleId')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR')
  removeSchedule(
    @Param('scheduleId', ParseUUIDPipe) scheduleId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.clinicsService.removeSchedule(
      scheduleId,
      req.user.id,
      req.user.role,
    );
  }

  // PATCH /api/clinics/doctors/:doctorProfileId/availability
  @Patch('doctors/:doctorProfileId/availability')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR')
  toggleAvailability(
    @Param('doctorProfileId', ParseUUIDPipe) doctorProfileId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.clinicsService.toggleDoctorAvailability(
      doctorProfileId,
      req.user.id,
      req.user.role,
    );
  }
}

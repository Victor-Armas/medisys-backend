import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { RequestWithUser } from '@auth/auth.controller';
import { ClinicsService } from './clinics.service';
import { CreateClinicDTO } from './dto/create-clinic.dto';
import { UpdateClinicDTO } from './dto/update-clinic.dto';
import { CreateScheduleRangeDTO } from './dto/create-schedule-range.dto';
import { CreateScheduleOverrideDTO } from './dto/create-schedule-override.dto';
import { GetAvailabilityDto } from './dto/get-availability.dto';
import { UpdateScheduleRangeDTO } from './dto/update-schedule-range.dto';
import { UpdateScheduleOverrideDTO } from './dto/update-schedule-override.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssignDoctorToClinicDTO } from './dto/assign-doctor-clinic.dto';

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

  // GET /api/clinics/selector
  // Este se usa para dropdowns, combos y procesos de agendamiento
  @Get('public/list')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR', 'RECEPTIONIST', 'PATIENT')
  findAllPublic() {
    // Sin filtros de asignación para agendar citas
    return this.clinicsService.findAllPublic();
  }

  // GET /api/clinics
  @Get()
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR', 'RECEPTIONIST')
  findAll(@Req() req: RequestWithUser) {
    return this.clinicsService.findAll(req.user.role, req.user.id);
  }

  // GET /api/clinics/me
  @Get('me')
  @Roles('MAIN_DOCTOR', 'DOCTOR')
  findAllMe(@Req() req: RequestWithUser) {
    return this.clinicsService.findMyDoctorClinics(req.user.id);
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

  // POST /api/clinics/schedules/range
  @Post('schedules/range')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR')
  createScheduleRange(
    @Body() dto: CreateScheduleRangeDTO,
    @Req() req: RequestWithUser,
  ) {
    return this.clinicsService.createScheduleRange(
      dto,
      req.user.id,
      req.user.role,
    );
  }

  // POST /api/clinics/schedules/override
  @Post('schedules/override')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR')
  createScheduleOverride(
    @Body() dto: CreateScheduleOverrideDTO,
    @Req() req: RequestWithUser,
  ) {
    return this.clinicsService.createScheduleOverride(
      dto,
      req.user.id,
      req.user.role,
    );
  }

  // DELETE /api/clinics/schedules/override/:overrideId
  @Delete('schedules/override/:overrideId')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR')
  deleteScheduleOverride(
    @Param('overrideId', ParseUUIDPipe) overrideId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.clinicsService.deleteScheduleOverride(
      overrideId,
      req.user.id,
      req.user.role,
    );
  }

  // GET /api/clinics/doctors/:doctorClinicId/availability
  @Get('doctors/:doctorClinicId/availability')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR', 'RECEPTIONIST', 'PATIENT')
  getDoctorAvailability(
    @Param('doctorClinicId', ParseUUIDPipe) doctorClinicId: string,
    @Query() dto: GetAvailabilityDto,
  ) {
    return this.clinicsService.getDoctorAvailability(doctorClinicId, dto);
  }

  // PATCH /api/clinics/schedules/range/:rangeId
  @Patch('schedules/range/:rangeId')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR')
  updateScheduleRange(
    @Param('rangeId', ParseUUIDPipe) rangeId: string,
    @Body() dto: UpdateScheduleRangeDTO,
    @Req() req: RequestWithUser,
  ) {
    return this.clinicsService.updateScheduleRange(
      rangeId,
      dto,
      req.user.id,
      req.user.role,
    );
  }

  // DELETE /api/clinics/schedules/range/:rangeId
  @Delete('schedules/range/:rangeId')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR')
  deleteScheduleRange(
    @Param('rangeId', ParseUUIDPipe) rangeId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.clinicsService.deleteScheduleRange(
      rangeId,
      req.user.id,
      req.user.role,
    );
  }

  // PATCH /api/clinics/schedules/override/:overrideId
  @Patch('schedules/override/:overrideId')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR')
  updateScheduleOverride(
    @Param('overrideId', ParseUUIDPipe) overrideId: string,
    @Body() dto: UpdateScheduleOverrideDTO,
    @Req() req: RequestWithUser,
  ) {
    return this.clinicsService.updateScheduleOverride(
      overrideId,
      dto,
      req.user.id,
      req.user.role,
    );
  }

  // POST /api/clinics/:id/logo
  @Post(':id/logo')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new Error('Solo se permiten imágenes'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  uploadLogo(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.clinicsService.uploadLogo(id, file.buffer);
  }

  // POST /api/clinics/:id/assign-doctor
  @Post(':id/assign-doctor')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR')
  assignDoctor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDoctorToClinicDTO,
  ) {
    return this.clinicsService.assignDoctor(id, dto);
  }

  // PATCH /api/clinics/:id/doctors/:doctorProfileId/deactivate
  @Patch(':id/doctors/:doctorProfileId/deactivate')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR')
  deactivateDoctor(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('doctorProfileId', ParseUUIDPipe) doctorProfileId: string,
  ) {
    return this.clinicsService.deactivateDoctor(id, doctorProfileId);
  }

  /**
   * Obtiene la lista de médicos que NO están asignados a una clínica específica.
   * Endpoint: GET /clinics/:id/eligible-doctors
   */
  @Get(':id/eligible-doctors')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR') // Solo quienes pueden asignar deben ver esta lista
  getEligibleDoctors(@Param('id', ParseUUIDPipe) id: string) {
    // Delegamos la lógica de filtrado compleja al servicio
    return this.clinicsService.getEligibleDoctors(id);
  }
}

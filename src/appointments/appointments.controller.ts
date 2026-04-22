// src/appointments/appointments.controller.ts

import {
  Body,
  Controller,
  Get,
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

import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { ListAppointmentsDto } from './dto/list-appointments.dto';
import { AppointmentsService } from './appointments.service';

// Todos los roles de staff pueden gestionar citas
const ALL_STAFF = [
  'ADMIN_SYSTEM',
  'MAIN_DOCTOR',
  'DOCTOR',
  'RECEPTIONIST',
] as const;

@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /**
   * POST /api/appointments
   * Staff crea una cita manualmente.
   */
  @Post()
  @Roles(...ALL_STAFF)
  create(@Body() dto: CreateAppointmentDto, @Req() req: RequestWithUser) {
    return this.appointmentsService.create(dto, req.user.role);
  }

  /**
   * GET /api/appointments
   * Lista citas con filtros opcionales.
   * Los doctores automáticamente ven solo las suyas.
   */
  @Get()
  @Roles(...ALL_STAFF)
  findAll(@Query() query: ListAppointmentsDto, @Req() req: RequestWithUser) {
    return this.appointmentsService.findAll(query, req.user.id, req.user.role);
  }

  /**
   * GET /api/appointments/:id
   * Detalle de una cita.
   */
  @Get(':id')
  @Roles(...ALL_STAFF)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) {
    return this.appointmentsService.findOne(id, req.user.id, req.user.role);
  }

  /**
   * PATCH /api/appointments/:id
   * Actualiza datos de la cita (hora, motivo, notas).
   */
  @Patch(':id')
  @Roles(...ALL_STAFF)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.appointmentsService.update(id, dto, req.user.id, req.user.role);
  }

  /**
   * PATCH /api/appointments/:id/status
   * Cambia el estado de la cita (confirmar, completar, cancelar).
   * Endpoint separado para que las transiciones de estado sean explícitas.
   */
  @Patch(':id/status')
  @Roles(...ALL_STAFF)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @Req() req: RequestWithUser,
  ) {
    return this.appointmentsService.updateStatus(
      id,
      dto,
      req.user.id,
      req.user.role,
    );
  }
}

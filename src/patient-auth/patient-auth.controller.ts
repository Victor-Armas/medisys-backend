import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { PatientAuthService } from './patient-auth.service';
import { PatientJwtAuthGuard } from './guards/patient-jwt-auth.guard';
import { PatientLoginDTO } from './dto/patient-auth.dto';
import { Request } from 'express';
import { CreatePatientAccountDTO } from './dto/create-auth.dto';

export interface PatientRequest extends Request {
  user: {
    patientAccountId: string;
    patientId: string;
    email: string;
  };
}

@ApiTags('Patient Auth')
@Controller('auth/patient')
export class PatientAuthController {
  constructor(private patientAuthService: PatientAuthService) {}

  /**
   * POST /api/auth/patient/login
   * Rate limiting: 5 intentos por IP en 15 minutos
   * Previene brute force sobre cuentas de pacientes (PHI)
   */
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60 * 15 * 1000 } })
  login(@Body() dto: PatientLoginDTO) {
    return this.patientAuthService.login(dto);
  }

  /**
   * POST /api/auth/patient/register/:patientId
   * El paciente debe existir en DB (creado por recepción).
   * Esta ruta crea las credenciales del portal.
   * Rate limiting: 3 registros por IP en 1 hora
   */
  @Post('register/:patientId')
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } })
  register(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreatePatientAccountDTO,
  ) {
    return this.patientAuthService.register(patientId, dto);
  }

  /**
   * GET /api/auth/patient/me
   * Requiere token JWT del portal (patient-jwt strategy)
   */
  @Get('me')
  @UseGuards(PatientJwtAuthGuard)
  getMe(@Req() req: PatientRequest) {
    return this.patientAuthService.getMe(req.user.patientId);
  }
}

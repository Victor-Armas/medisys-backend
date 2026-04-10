import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface PatientJwtPayload {
  sub: string; // patientAccountId
  patientId: string;
  email: string;
}

/**
 * Estrategia JWT exclusiva para el portal del paciente.
 * Usa JWT_PATIENT_SECRET — separado del JWT_SECRET del staff.
 * Si el secret del staff se compromete, el portal queda protegido y viceversa.
 */
@Injectable()
export class PatientJwtStrategy extends PassportStrategy(
  Strategy,
  'patient-jwt',
) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_PATIENT_SECRET'),
    });
  }

  async validate(payload: PatientJwtPayload) {
    // Verificar que la cuenta sigue activa en cada request
    const account = await this.prisma.patientAccount.findUnique({
      where: { id: payload.sub },
      select: { id: true, isActive: true, patientId: true },
    });

    if (!account || !account.isActive) {
      throw new UnauthorizedException(
        'Cuenta de paciente inactiva o no encontrada',
      );
    }

    return {
      patientAccountId: payload.sub,
      patientId: payload.patientId,
      email: payload.email,
    };
  }
}

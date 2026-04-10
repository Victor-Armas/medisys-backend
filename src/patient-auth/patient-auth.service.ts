import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { PatientLoginDTO } from './dto/patient-auth.dto';
import { CreatePatientAccountDTO } from './dto/create-auth.dto';

@Injectable()
export class PatientAuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ─── LOGIN ────────────────────────────────────────────────────────────────

  async login(dto: PatientLoginDTO) {
    const account = await this.prisma.patientAccount.findUnique({
      where: { email: dto.email },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastNamePaternal: true,
            isActive: true,
          },
        },
      },
    });

    if (!account) {
      // Mensaje genérico: no revelar si el email existe o no
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!account.isActive || !account.patient.isActive) {
      throw new UnauthorizedException(
        'Cuenta inactiva. Contacta a la clínica.',
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, account.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const token = this.signToken(account.id, account.patientId, account.email);

    return {
      access_token: token,
      patient: {
        id: account.patientId,
        firstName: account.patient.firstName,
        lastNamePaternal: account.patient.lastNamePaternal,
        email: account.email,
      },
    };
  }

  // ─── CREAR CUENTA DESDE PORTAL ───────────────────────────────────────────
  // El paciente ya debe existir (creado por recepción).
  // Se vincula por email del PatientAccount.

  async register(patientId: string, dto: CreatePatientAccountDTO) {
    // Verificar que el paciente existe
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, isActive: true, account: { select: { id: true } } },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    if (!patient.isActive)
      throw new UnauthorizedException('El paciente está inactivo');
    if (patient.account)
      throw new ConflictException('Este paciente ya tiene una cuenta');

    // Verificar que el email no esté en uso
    const emailExists = await this.prisma.patientAccount.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (emailExists) throw new ConflictException('El email ya está en uso');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const account = await this.prisma.patientAccount.create({
      data: {
        patientId,
        email: dto.email,
        password: hashedPassword,
      },
      select: { id: true, email: true, patientId: true },
    });

    return {
      access_token: this.signToken(
        account.id,
        account.patientId,
        account.email,
      ),
      patient: { id: account.patientId, email: account.email },
    };
  }

  // ─── ME ───────────────────────────────────────────────────────────────────

  async getMe(patientId: string) {
    return this.prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastNamePaternal: true,
        lastNameMaternal: true,
        email: true,
        phone: true,
        birthDate: true,
        gender: true,
        bloodType: true,
      },
    });
  }

  // ─── PRIVATE ──────────────────────────────────────────────────────────────

  private signToken(
    accountId: string,
    patientId: string,
    email: string,
  ): string {
    const signOptions: JwtSignOptions = {
      secret: this.config.get<string>('JWT_PATIENT_SECRET'),
      expiresIn:
        (this.config.get<string>(
          'JWT_PATIENT_EXPIRES_IN',
        ) as JwtSignOptions['expiresIn']) ?? '24h', // Aseguramos que el cast se aplique al valor obtenido y luego evaluamos el default
    };

    return this.jwt.sign({ sub: accountId, patientId, email }, signOptions);
  }
}

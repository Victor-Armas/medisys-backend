// src/consultations/consultations.service.ts

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@generated/prisma/client';
import {
  CreateConsultationDTO,
  CreateDiagnosisDTO,
} from './dto/create-consultation.dto';
import { UpdateConsultationDTO } from './dto/update-consultation.dto';
import { ListConsultationsDTO } from './dto/list-consultations.dto';
import {
  CONSULTATION_LIST_SELECT,
  CONSULTATION_DETAIL_SELECT,
} from './constants/consultation.select';

@Injectable()
export class ConsultationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── CREAR ──────────────────────────────────────────────────────────────────

  /**
   * Crea la consulta completa en una sola transacción:
   * Consultation + VitalSigns (opcional) + Diagnósticos (opcional) + Folio CON
   */
  async create(
    dto: CreateConsultationDTO,
    requestingUserId: string,
    userRole: string,
  ) {
    // 1. Validar DoctorClinic y AUTORIZACIÓN (KISS y Seguridad)
    const doctorClinic = await this.prisma.doctorClinic.findUnique({
      where: { id: dto.doctorClinicId },
      select: {
        id: true,
        isActive: true,
        clinicId: true,
        doctorProfile: { select: { userId: true } },
      },
    });

    if (!doctorClinic || !doctorClinic.isActive) {
      throw new NotFoundException(
        'Médico/consultorio no encontrado o inactivo',
      );
    }

    // Usamos el requestingUserId para evitar que un médico cree consultas a nombre de otro
    if (
      userRole === 'DOCTOR' &&
      doctorClinic.doctorProfile.userId !== requestingUserId
    ) {
      throw new ForbiddenException(
        'No tienes permisos para crear consultas en este consultorio',
      );
    }

    // 2. Validar Cita (Si aplica)
    if (dto.appointmentId) {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: dto.appointmentId },
        select: { id: true, consultation: { select: { id: true } } },
      });
      if (!appointment) throw new NotFoundException('Cita no encontrada');
      if (appointment.consultation) {
        throw new BadRequestException(
          'Esta cita ya tiene una consulta registrada',
        );
      }
    }

    // 3. Resolver Paciente (Lazy Registration) - Extraído para Clean Code
    const patientId = await this.resolvePatient(dto);

    // 4. Transacción Atómica
    return this.prisma.$transaction(async (tx) => {
      const folio = await this.generateFolio(tx, doctorClinic.clinicId, 'CON');

      const consultation = await tx.consultation.create({
        data: {
          folioNumber: folio,
          appointmentId: dto.appointmentId ?? null,
          patientId, // Paciente ya validado o creado al vuelo
          doctorClinicId: dto.doctorClinicId,
          consultationType: dto.consultationType ?? 'FOLLOW_UP',
          reasonForVisit: dto.reasonForVisit,
          currentCondition: dto.currentCondition,
          physicalExamFindings: dto.physicalExamFindings ?? null,
          labResultsSummary: dto.labResultsSummary ?? null,
          clinicalImpressions: dto.clinicalImpressions ?? null,
          treatmentPlan: dto.treatmentPlan ?? null,
          patientInstructions: dto.patientInstructions ?? null,
          prognosis: dto.prognosis ?? null,
          requiresFollowUp: dto.requiresFollowUp ?? false,
          followUpDays: dto.followUpDays ?? null,
          followUpNotes: dto.followUpNotes ?? null,

          ...(dto.vitalSigns && {
            vitalSigns: {
              create: {
                ...dto.vitalSigns,
                bmi: this.calculateBmi(
                  dto.vitalSigns.weightKg,
                  dto.vitalSigns.heightCm,
                  dto.vitalSigns.bmi,
                ),
              },
            },
          }),

          ...(dto.diagnoses?.length && {
            diagnoses: {
              create: dto.diagnoses.map((d, index) => ({
                icd10Code: d.icd10Code ?? null,
                description: d.description,
                diagnosisType: d.diagnosisType ?? 'DEFINITIVE',
                isMain: d.isMain ?? index === 0,
                notes: d.notes ?? null,
                sortOrder: d.sortOrder ?? index,
              })),
            },
          }),
        },
        select: CONSULTATION_DETAIL_SELECT,
      });

      // Actualizar el estado de la cita si se enlazó a una
      if (dto.appointmentId) {
        await tx.appointment.update({
          where: { id: dto.appointmentId },
          data: { status: 'IN_PROGRESS' },
        });
      }

      return consultation;
    });
  }

  // ── LISTAR ─────────────────────────────────────────────────────────────────

  async findAll(
    query: ListConsultationsDTO,
    requestingUserId: string,
    userRole: string,
  ) {
    const {
      patientId,
      doctorClinicId,
      clinicId,
      dateFrom,
      dateTo,
      consultationType,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.ConsultationWhereInput = {};

    // DOCTOR: solo ve sus propias consultas
    if (userRole === 'DOCTOR') {
      where.doctorClinic = {
        doctorProfile: { userId: requestingUserId },
      };
    }

    if (patientId) where.patientId = patientId;

    if (doctorClinicId) {
      where.doctorClinicId = doctorClinicId;
    }

    if (clinicId) {
      where.doctorClinic = {
        ...(where.doctorClinic as object),
        clinicId,
      };
    }

    if (dateFrom || dateTo) {
      where.consultedAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(`${dateTo}T23:59:59`) }),
      };
    }

    if (consultationType) where.consultationType = consultationType;

    const [consultations, total] = await Promise.all([
      this.prisma.consultation.findMany({
        where,
        select: CONSULTATION_LIST_SELECT,
        orderBy: { consultedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.consultation.count({ where }),
    ]);

    return { consultations, total, page, limit };
  }

  // ── DETALLE ────────────────────────────────────────────────────────────────

  async findOne(id: string, requestingUserId: string, userRole: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id },
      select: CONSULTATION_DETAIL_SELECT,
    });

    if (!consultation) throw new NotFoundException('Consulta no encontrada');

    // DOCTOR: solo puede ver sus propias consultas
    if (userRole === 'DOCTOR') {
      const ownerId = consultation.doctorClinic.doctorProfile.user.id;
      if (ownerId !== requestingUserId) {
        throw new ForbiddenException('No tienes acceso a esta consulta');
      }
    }

    return consultation;
  }

  // ── HISTORIAL DEL PACIENTE ─────────────────────────────────────────────────

  async findByPatient(
    patientId: string,
    requestingUserId: string,
    userRole: string,
  ) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    const where: Prisma.ConsultationWhereInput = { patientId };

    // DOCTOR: solo sus consultas del paciente
    if (userRole === 'DOCTOR') {
      where.doctorClinic = {
        doctorProfile: { userId: requestingUserId },
      };
    }

    return this.prisma.consultation.findMany({
      where,
      select: CONSULTATION_LIST_SELECT,
      orderBy: { consultedAt: 'desc' },
    });
  }

  // ── ACTUALIZAR ─────────────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateConsultationDTO,
    requestingUserId: string,
    userRole: string,
  ) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id },
      select: {
        id: true,
        doctorClinic: {
          select: { doctorProfile: { select: { userId: true } } },
        },
        prescription: { select: { status: true } },
      },
    });

    if (!consultation) throw new NotFoundException('Consulta no encontrada');

    // DOCTOR: solo puede editar sus propias consultas
    if (userRole === 'DOCTOR') {
      const ownerId = consultation.doctorClinic.doctorProfile.userId;
      if (ownerId !== requestingUserId) {
        throw new ForbiddenException(
          'No tienes permiso para editar esta consulta',
        );
      }
    }

    // No se puede editar si la receta ya fue emitida
    if (consultation.prescription?.status === 'ISSUED') {
      throw new BadRequestException(
        'No se puede editar una consulta con receta ya emitida',
      );
    }

    // Actualizar signos vitales si vienen en el DTO
    if (dto.vitalSigns) {
      await this.prisma.vitalSigns.upsert({
        where: { consultationId: id },
        update: {
          weightKg: dto.vitalSigns.weightKg ?? null,
          heightCm: dto.vitalSigns.heightCm ?? null,
          bmi: this.calculateBmi(
            dto.vitalSigns.weightKg,
            dto.vitalSigns.heightCm,
            dto.vitalSigns.bmi,
          ),
          bloodPressure: dto.vitalSigns.bloodPressure ?? null,
          heartRateBpm: dto.vitalSigns.heartRateBpm ?? null,
          respiratoryRate: dto.vitalSigns.respiratoryRate ?? null,
          temperatureC: dto.vitalSigns.temperatureC ?? null,
          oxygenSaturation: dto.vitalSigns.oxygenSaturation ?? null,
          glucoseMgdl: dto.vitalSigns.glucoseMgdl ?? null,
          notes: dto.vitalSigns.notes ?? null,
        },
        create: {
          consultationId: id,
          weightKg: dto.vitalSigns.weightKg ?? null,
          heightCm: dto.vitalSigns.heightCm ?? null,
          bmi: this.calculateBmi(
            dto.vitalSigns.weightKg,
            dto.vitalSigns.heightCm,
            dto.vitalSigns.bmi,
          ),
          bloodPressure: dto.vitalSigns.bloodPressure ?? null,
          heartRateBpm: dto.vitalSigns.heartRateBpm ?? null,
          respiratoryRate: dto.vitalSigns.respiratoryRate ?? null,
          temperatureC: dto.vitalSigns.temperatureC ?? null,
          oxygenSaturation: dto.vitalSigns.oxygenSaturation ?? null,
          glucoseMgdl: dto.vitalSigns.glucoseMgdl ?? null,
          notes: dto.vitalSigns.notes ?? null,
        },
      });
    }

    // Extraer vitalSigns, diagnoses y patient del DTO para no pasarlos a la consulta
    const {
      vitalSigns: _vs,
      diagnoses: _dx,
      patient: _pt,
      ...consultationData
    } = dto;

    return this.prisma.consultation.update({
      where: { id },
      data: consultationData,
      select: CONSULTATION_DETAIL_SELECT,
    });
  }

  // ── AGREGAR DIAGNÓSTICO ────────────────────────────────────────────────────

  async addDiagnosis(
    consultationId: string,
    dto: CreateDiagnosisDTO,
    requestingUserId: string,
    userRole: string,
  ) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      select: {
        id: true,
        doctorClinic: {
          select: { doctorProfile: { select: { userId: true } } },
        },
        prescription: { select: { status: true } },
        diagnoses: { select: { id: true, isMain: true } },
      },
    });

    if (!consultation) throw new NotFoundException('Consulta no encontrada');

    if (userRole === 'DOCTOR') {
      const ownerId = consultation.doctorClinic.doctorProfile.userId;
      if (ownerId !== requestingUserId) {
        throw new ForbiddenException(
          'No tienes permiso para editar esta consulta',
        );
      }
    }

    if (consultation.prescription?.status === 'ISSUED') {
      throw new BadRequestException(
        'No se puede modificar una consulta con receta emitida',
      );
    }

    // Si el nuevo diagnóstico se marca como principal, quitar el flag a los demás
    if (dto.isMain) {
      await this.prisma.consultationDiagnosis.updateMany({
        where: { consultationId, isMain: true },
        data: { isMain: false },
      });
    }

    const nextOrder = consultation.diagnoses.length;

    return this.prisma.consultationDiagnosis.create({
      data: {
        consultationId,
        icd10Code: dto.icd10Code ?? null,
        description: dto.description,
        diagnosisType: dto.diagnosisType ?? 'DEFINITIVE',
        isMain: dto.isMain ?? consultation.diagnoses.length === 0,
        notes: dto.notes ?? null,
        sortOrder: dto.sortOrder ?? nextOrder,
      },
    });
  }

  // ── ELIMINAR DIAGNÓSTICO ───────────────────────────────────────────────────

  async removeDiagnosis(
    consultationId: string,
    diagnosisId: string,
    requestingUserId: string,
    userRole: string,
  ) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      select: {
        id: true,
        doctorClinic: {
          select: { doctorProfile: { select: { userId: true } } },
        },
        prescription: { select: { status: true } },
        diagnoses: { select: { id: true, isMain: true } },
      },
    });

    if (!consultation) throw new NotFoundException('Consulta no encontrada');

    if (userRole === 'DOCTOR') {
      const ownerId = consultation.doctorClinic.doctorProfile.userId;
      if (ownerId !== requestingUserId) {
        throw new ForbiddenException('No tienes permiso');
      }
    }

    if (consultation.prescription?.status === 'ISSUED') {
      throw new BadRequestException(
        'No se puede modificar una consulta con receta emitida',
      );
    }

    const diagnosis = await this.prisma.consultationDiagnosis.findFirst({
      where: { id: diagnosisId, consultationId },
      select: { id: true, isMain: true },
    });

    if (!diagnosis) throw new NotFoundException('Diagnóstico no encontrado');

    await this.prisma.consultationDiagnosis.delete({
      where: { id: diagnosisId },
    });

    // Si se eliminó el principal y quedan más, promover el primero
    if (diagnosis.isMain) {
      const remaining = consultation.diagnoses.filter(
        (d) => d.id !== diagnosisId,
      );
      if (remaining.length > 0) {
        await this.prisma.consultationDiagnosis.update({
          where: { id: remaining[0].id },
          data: { isMain: true },
        });
      }
    }
  }

  // ── HELPERS PRIVADOS ───────────────────────────────────────────────────────

  private calculateBmi(
    weightKg: number | undefined,
    heightCm: number | undefined,
    providedBmi: number | undefined,
  ): number | null {
    // Si el médico lo calculó manualmente, usar ese valor
    if (providedBmi) return providedBmi;
    // Calcular solo si tenemos ambos valores
    if (weightKg && heightCm && heightCm > 0) {
      const heightM = heightCm / 100;
      return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
    }
    return null;
  }

  private async generateFolio(
    tx: Prisma.TransactionClient,
    clinicId: string,
    type: 'CON' | 'REC',
  ): Promise<string> {
    const year = new Date().getFullYear();

    const sequence = await tx.folioSequence.upsert({
      where: { clinicId_type_year: { clinicId, type, year } },
      update: { lastNumber: { increment: 1 } },
      create: { clinicId, type, year, lastNumber: 1 },
      select: { lastNumber: true },
    });

    const number = sequence.lastNumber.toString().padStart(6, '0');
    return `${type}-${year}-${number}`;
  }

  // ── SUGERENCIAS DE MEDICAMENTOS ────────────────────────────────────────────

  /**
   * Retorna medicamentos sugeridos para un array de códigos ICD-10.
   * El sistema aprende con el uso: usageCount se incrementa cada vez
   * que el médico acepta una sugerencia → sube en el ranking.
   *
   * Orden: priority ASC, usageCount DESC (menos priority = más importante)
   */
  async getMedicationSuggestions(icd10Codes: string[]) {
    if (!icd10Codes.length) return [];

    const suggestions = await this.prisma.icdMedicationSuggestion.findMany({
      where: {
        icd10Code: { in: icd10Codes },
        isActive: true,
      },
      select: {
        id: true,
        icd10Code: true,
        defaultDose: true,
        defaultFrequency: true,
        defaultDuration: true,
        defaultRoute: true,
        defaultQuantity: true,
        priority: true,
        usageCount: true,
        medicationCatalog: {
          select: {
            id: true,
            name: true,
            form: true,
            concentration: true,
            description: true,
          },
        },
      },
      orderBy: [{ priority: 'asc' }, { usageCount: 'desc' }],
      take: 15, // máximo 15 sugerencias para no saturar la UI
    });

    // Deduplicar por medicamento si el mismo aparece para múltiples diagnósticos
    const seen = new Set<string>();
    return suggestions.filter((s) => {
      if (seen.has(s.medicationCatalog.id)) return false;
      seen.add(s.medicationCatalog.id);
      return true;
    });
  }

  /**
   * Aplica Lazy Registration: Si envían patientId, lo valida.
   * Si envían el objeto patient, lo busca por similitud o lo crea.
   */
  private async resolvePatient(dto: CreateConsultationDTO): Promise<string> {
    if (dto.patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { id: dto.patientId },
        select: { id: true, isActive: true },
      });
      if (!patient) throw new NotFoundException('Paciente no encontrado');
      if (!patient.isActive)
        throw new BadRequestException('El paciente está inactivo');

      return patient.id;
    }

    if (!dto.patient) {
      throw new BadRequestException(
        'Debes enviar un patientId o los datos del paciente para registrarlo al vuelo',
      );
    }

    const normalize = (text: string) => text.trim().toUpperCase();

    // Buscar duplicado básico
    const existingPatient = await this.prisma.patient.findFirst({
      where: {
        firstName: normalize(dto.patient.firstName),
        lastNamePaternal: normalize(dto.patient.lastNamePaternal),
        birthDate: new Date(dto.patient.birthDate),
      },
      select: { id: true },
    });

    if (existingPatient) return existingPatient.id;

    // Crear "On-The-Fly"
    const newPatient = await this.prisma.patient.create({
      data: {
        firstName: normalize(dto.patient.firstName),
        middleName: dto.patient.middleName ?? null,
        lastNamePaternal: normalize(dto.patient.lastNamePaternal),
        lastNameMaternal: dto.patient.lastNameMaternal ?? null,
        birthDate: new Date(dto.patient.birthDate),
        gender: dto.patient.gender,
        phone: dto.patient.phone ?? null,
        isActive: true,
      },
      select: { id: true },
    });

    return newPatient.id;
  }
}

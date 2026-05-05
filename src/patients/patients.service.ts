import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDTO } from './dto/create-patient.dto';
import { UpdatePatientDTO } from './dto/update-patient.dto';
import { CreateMedicalHistoryDTO } from './dto/create-medical-history.dto';
import { CreatePatientAddressDTO } from './dto/create-patient-address.dto';
import {
  PATIENT_LIST_SELECT,
  PATIENT_DETAIL_SELECT,
  MEDICAL_HISTORY_SELECT,
  ADDRESS_SELECT,
  ALLERGY_SELECT,
} from './constants/patient.select';
import { Prisma } from '@generated/prisma/browser';
import { MedicalHistoryPDFProps } from 'src/pdf/templates/medical-history';
import { PdfService } from 'src/pdf/pdf.service';

@Injectable()
export class PatientsService {
  constructor(
    private prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) {}

  // ─── CREATE ───────────────────────────────────────────────────────────────

  async create(dto: CreatePatientDTO) {
    // Validar CURP único si se proporciona
    if (dto.curp) {
      const exists = await this.prisma.patient.findUnique({
        where: { curp: dto.curp },
        select: { id: true },
      });
      if (exists)
        throw new ConflictException('Ya existe un paciente con ese CURP');
    }

    // Validar clínica si se proporciona
    if (dto.clinicId) {
      await this.validateClinicExists(dto.clinicId);
    }

    return this.prisma.patient.create({
      data: {
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastNamePaternal: dto.lastNamePaternal,
        lastNameMaternal: dto.lastNameMaternal,
        birthDate: new Date(dto.birthDate),
        gender: dto.gender,
        curp: dto.curp,
        phone: dto.phone,
        email: dto.email,
        maritalStatus: dto.maritalStatus,
        occupation: dto.occupation,
        educationLevel: dto.educationLevel,
        bloodType: dto.bloodType,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        emergencyContactRelation: dto.emergencyContactRelation,
        // Crear vínculo con clínica si se proporciona
        ...(dto.clinicId && {
          clinics: {
            create: { clinicId: dto.clinicId, isActive: true },
          },
        }),
      },
      select: PATIENT_DETAIL_SELECT,
    });
  }

  // ─── READ ─────────────────────────────────────────────────────────────────

  async findAll(options: {
    clinicId?: string;
    search?: string;
    page?: number;
    limit?: number;
    includeAllergies?: boolean;
  }) {
    const {
      clinicId,
      search,
      page = 1,
      limit = 20,
      includeAllergies,
    } = options;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (clinicId) {
      where.clinics = { some: { clinicId, isActive: true } };
    }

    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastNamePaternal: { contains: q, mode: 'insensitive' } },
        { lastNameMaternal: { contains: q, mode: 'insensitive' } },
        { curp: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const select: Prisma.PatientSelect = {
      ...PATIENT_LIST_SELECT,
      ...(includeAllergies && {
        allergies: {
          where: { isActive: true },
          select: ALLERGY_SELECT,
          orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }],
        },
      }),
    };

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        select,
        orderBy: { lastNamePaternal: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.patient.count({ where }),
    ]);

    return { patients, total, page, limit };
  }

  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      select: PATIENT_DETAIL_SELECT,
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    return patient;
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdatePatientDTO) {
    await this.findOne(id); // verifica existencia

    if (dto.curp) {
      const conflict = await this.prisma.patient.findFirst({
        where: { curp: dto.curp, id: { not: id } },
        select: { id: true },
      });
      if (conflict)
        throw new ConflictException('Ya existe un paciente con ese CURP');
    }

    return this.prisma.patient.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.birthDate && { birthDate: new Date(dto.birthDate) }),
      },
      select: PATIENT_DETAIL_SELECT,
    });
  }

  // ─── MEDICAL HISTORY ──────────────────────────────────────────────────────

  async createMedicalHistory(patientId: string, dto: CreateMedicalHistoryDTO) {
    await this.findOne(patientId);

    // Historia clínica es 1:1 — solo puede existir una por paciente
    const existing = await this.prisma.medicalHistory.findUnique({
      where: { patientId },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'Este paciente ya tiene una historia clínica. Usa el endpoint de actualización.',
      );
    }

    return this.prisma.medicalHistory.create({
      data: {
        patientId,
        ...dto,
        ...(dto.lastMenstrualPeriod && {
          lastMenstrualPeriod: new Date(dto.lastMenstrualPeriod),
        }),
      },
      select: MEDICAL_HISTORY_SELECT,
    });
  }

  async getMedicalHistory(patientId: string) {
    const history = await this.prisma.medicalHistory.findUnique({
      where: { patientId },
      select: MEDICAL_HISTORY_SELECT,
    });
    if (!history)
      throw new NotFoundException(
        'Este paciente no tiene historia clínica aún',
      );
    return history;
  }

  async updateMedicalHistory(
    patientId: string,
    dto: Partial<CreateMedicalHistoryDTO>,
  ) {
    const existing = await this.prisma.medicalHistory.findUnique({
      where: { patientId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(
        'No existe historia clínica para este paciente. Créala primero.',
      );
    }

    return this.prisma.medicalHistory.update({
      where: { patientId },
      data: {
        ...dto,
        ...(dto.lastMenstrualPeriod && {
          lastMenstrualPeriod: new Date(dto.lastMenstrualPeriod),
        }),
      },
      select: MEDICAL_HISTORY_SELECT,
    });
  }

  // ─── ADDRESSES ────────────────────────────────────────────────────────────

  async addAddress(patientId: string, dto: CreatePatientAddressDTO) {
    await this.findOne(patientId);

    // Si se marca como primaria, quitarle ese flag a las demás
    if (dto.isPrimary) {
      await this.prisma.patientAddress.updateMany({
        where: { patientId },
        data: { isPrimary: false },
      });
    }

    return this.prisma.patientAddress.create({
      data: {
        patientId,
        country: dto.country,
        isPrimary: dto.isPrimary,
        postalCodeId: dto.postalCodeId,
        neighborhoodId: dto.neighborhoodId,
        street: dto.street,
        extNumber: dto.extNumber,
        intNumber: dto.intNumber,
        foreignState: dto.foreignState,
        foreignCity: dto.foreignCity,
        foreignPostalCode: dto.foreignPostalCode,
        foreignAddressLine: dto.foreignAddressLine,
      },
      select: ADDRESS_SELECT,
    });
  }

  async updateAddress(
    patientId: string,
    addressId: string,
    dto: Partial<CreatePatientAddressDTO>,
  ) {
    const address = await this.prisma.patientAddress.findFirst({
      where: { id: addressId, patientId },
    });
    if (!address) throw new NotFoundException('Dirección no encontrada');

    if (dto.isPrimary) {
      await this.prisma.patientAddress.updateMany({
        where: { patientId, id: { not: addressId } },
        data: { isPrimary: false },
      });
    }

    return this.prisma.patientAddress.update({
      where: { id: addressId },
      data: dto,
      select: ADDRESS_SELECT,
    });
  }

  // ─── CLINIC ASSIGNMENT ────────────────────────────────────────────────────

  async assignToClinic(patientId: string, clinicId: string) {
    await this.findOne(patientId);
    await this.validateClinicExists(clinicId);

    const existing = await this.prisma.patientClinic.findUnique({
      where: { patientId_clinicId: { patientId, clinicId } },
    });

    if (existing) {
      if (existing.isActive)
        throw new ConflictException(
          'El paciente ya está asignado a esta clínica',
        );
      // Reactivar si estaba inactivo
      return this.prisma.patientClinic.update({
        where: { patientId_clinicId: { patientId, clinicId } },
        data: { isActive: true },
      });
    }

    return this.prisma.patientClinic.create({
      data: { patientId, clinicId, isActive: true },
    });
  }

  async generateRecordPdf(patientId: string): Promise<Buffer> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        conditions: { where: { isActive: true } },
        medications: { where: { isActive: true } },
        allergies: { where: { isActive: true } },
        medicalHistory: true,
      },
    });

    if (!patient) throw new NotFoundException('Paciente no encontrado');

    const age =
      new Date().getFullYear() - new Date(patient.birthDate).getFullYear();
    const patientName = [
      patient.firstName,
      patient.middleName,
      patient.lastNamePaternal,
      patient.lastNameMaternal,
    ]
      .filter(Boolean)
      .join(' ');

    const HABIT_ES: Record<string, string> = {
      NEVER: 'Nunca',
      FORMER: 'Anteriormente',
      CURRENT: 'Activo',
      UNKNOWN: 'Desconocido',
    };

    const props: MedicalHistoryPDFProps = {
      patientName,
      patientAge: age,
      patientGender: patient.gender,
      patientCurp: patient.curp,
      patientBloodType: patient.bloodType,
      patientPhone: patient.phone,
      patientBirthDate: patient.birthDate.toISOString(),
      clinicName: 'MediSys',
      generatedAt: new Date().toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      allergies: patient.allergies.map((a) => ({
        substance: a.substance,
        severity: a.severity,
      })),
      diseases: patient.conditions
        .filter((c) => c.category === 'DISEASE' && c.type === 'PATHOLOGICAL')
        .map((c) => ({ icd10Code: c.icd10Code, description: c.description })),
      surgeries: patient.conditions
        .filter((c) => c.category === 'SURGERY')
        .map((c) => ({ description: c.description })),
      trauma: patient.conditions
        .filter((c) => c.category === 'TRAUMA')
        .map((c) => ({ description: c.description })),
      hospitalizations: patient.conditions
        .filter((c) => c.category === 'HOSPITALIZATION')
        .map((c) => ({ description: c.description })),
      familyHistory: patient.conditions
        .filter((c) => c.type === 'FAMILY')
        .map((c) => ({
          familyMember: c.familyMember ?? 'OTHER',
          description: c.description,
          icd10Code: c.icd10Code,
        })),
      medications: patient.medications.map((m) => ({
        name: m.name,
        dose: m.dose,
        frequency: m.frequency,
      })),
      smoking: HABIT_ES[patient.medicalHistory?.smoking ?? 'UNKNOWN'],
      alcoholUse: HABIT_ES[patient.medicalHistory?.alcoholUse ?? 'UNKNOWN'],
      drugUse: HABIT_ES[patient.medicalHistory?.drugUse ?? 'UNKNOWN'],
      bloodTransfusions: patient.medicalHistory?.bloodTransfusions ?? false,
      pets: patient.medicalHistory?.pets ?? false,
      tattoos: patient.medicalHistory?.tattoos ?? false,
      woodSmokeExposure: patient.medicalHistory?.woodSmokeExposure ?? false,
      immunizations: patient.medicalHistory?.immunizations,
      physicalActivity: patient.medicalHistory?.physicalActivity,
      gynecological:
        patient.gender !== 'MALE' && patient.medicalHistory
          ? {
              menarche: patient.medicalHistory.menarche,
              menstrualCycle: patient.medicalHistory.menstrualCycle,
              gestations: patient.medicalHistory.gestations,
              deliveries: patient.medicalHistory.deliveries,
              caesareans: patient.medicalHistory.caesareans,
              abortions: patient.medicalHistory.abortions,
              contraceptiveMethod: patient.medicalHistory.contraceptiveMethod,
              menopause: patient.medicalHistory.menopause,
            }
          : null,
    };

    return this.pdfService.generateMedicalHistory(props);
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────

  private async validateClinicExists(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, isActive: true },
    });
    if (!clinic) throw new NotFoundException('Consultorio no encontrado');
    if (!clinic.isActive)
      throw new BadRequestException('El consultorio está inactivo');
  }
}

// src/prescriptions/prescriptions.service.ts

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreatePrescriptionDTO } from './dto/create-prescription.dto';
import { UpdatePrescriptionDTO } from './dto/update-prescription.dto';
import { Prisma } from '@generated/prisma/client';

// ── Select reutilizable ────────────────────────────────────────────────────────

const PRESCRIPTION_DETAIL_SELECT = {
  id: true,
  folioNumber: true,
  status: true,
  doctorName: true,
  doctorLicense: true,
  doctorSpecialty: true,
  clinicName: true,
  clinicAddress: true,
  clinicPhone: true,
  pdfUrl: true,
  pdfPublicId: true,
  issuedAt: true,
  expiresAt: true,
  createdAt: true,
  consultation: {
    select: {
      id: true,
      folioNumber: true,
      consultedAt: true,
    },
  },
  patient: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastNamePaternal: true,
      lastNameMaternal: true,
      birthDate: true,
      gender: true,
    },
  },
  items: {
    select: {
      id: true,
      medicationName: true,
      brandName: true,
      dose: true,
      frequency: true,
      duration: true,
      route: true,
      quantity: true,
      instructions: true,
      sortOrder: true,
      catalogId: true,
      consultationDiagnosisId: true,
    },
    orderBy: {
      sortOrder: 'asc',
    } as Prisma.PrescriptionItemOrderByWithRelationInput,
  },
} satisfies Prisma.PrescriptionSelect;

// ── Validez de receta (días) ───────────────────────────────────────────────────
const PRESCRIPTION_VALIDITY_DAYS = 30;

@Injectable()
export class PrescriptionsService {
  private readonly logger = new Logger(PrescriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // ── CREAR ──────────────────────────────────────────────────────────────────

  /**
   * Crea una receta en estado DRAFT para una consulta.
   *
   * Flujo:
   *   1. Validar que la consulta existe y no tiene receta aún
   *   2. Obtener el snapshot del médico y consultorio
   *   3. Generar folio REC-YYYY-NNNNNN
   *   4. Crear Prescription + PrescriptionItems
   *   5. Incrementar usageCount en IcdMedicationSuggestion si aplica
   */
  async create(dto: CreatePrescriptionDTO) {
    // 1. Validar consulta
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: dto.consultationId },
      select: {
        id: true,
        patientId: true,
        doctorClinicId: true,
        prescription: { select: { id: true } },
        doctorClinic: {
          select: {
            clinicId: true,
            clinic: {
              select: {
                name: true,
                address: true,
                phone: true,
                logoUrl: true,
              },
            },
            doctorProfile: {
              select: {
                specialty: true,
                professionalLicense: true,
                signatureUrl: true,
                fullTitle: true,
                user: {
                  select: {
                    firstName: true,
                    middleName: true,
                    lastNamePaternal: true,
                    lastNameMaternal: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!consultation) throw new NotFoundException('Consulta no encontrada');
    if (consultation.prescription) {
      throw new ConflictException(
        'Esta consulta ya tiene una receta. Usa el endpoint de actualización.',
      );
    }

    // 2. Validar que hay ítems
    if (!dto.items?.length) {
      throw new BadRequestException(
        'La receta debe tener al menos un medicamento',
      );
    }

    const dc = consultation.doctorClinic;
    const profile = dc?.doctorProfile;
    const user = profile?.user;
    const clinic = dc?.clinic;

    // Construir nombre completo del médico
    const doctorFullName = [
      user?.firstName,
      user?.middleName,
      user?.lastNamePaternal,
      user?.lastNameMaternal,
    ]
      .filter(Boolean)
      .join(' ');

    // 3. Transacción: folio + receta + ítems
    return this.prisma.$transaction(async (tx) => {
      // 3a. Generar folio REC
      const folio = await this.generateFolio(tx, dc.clinicId, 'REC');

      // 3b. Calcular fecha de vencimiento
      const issuedAt = new Date();
      const expiresAt = new Date(issuedAt);
      expiresAt.setDate(expiresAt.getDate() + PRESCRIPTION_VALIDITY_DAYS);

      // 3c. Crear receta con sus ítems
      const prescription = await tx.prescription.create({
        data: {
          folioNumber: folio,
          consultationId: dto.consultationId,
          patientId: consultation.patientId,
          doctorClinicId: consultation.doctorClinicId,
          status: 'DRAFT',

          // Snapshot del médico
          doctorName: profile?.fullTitle ?? doctorFullName,
          doctorLicense: profile?.professionalLicense ?? '',
          doctorSpecialty: profile?.specialty ?? null,

          // Snapshot del consultorio
          clinicName: clinic?.name ?? '',
          clinicAddress: clinic?.address ?? null,
          clinicPhone: clinic?.phone ?? null,

          issuedAt,
          expiresAt,

          // Ítems
          items: {
            create: dto.items.map((item, index) => ({
              catalogId: item.catalogId ?? null,
              consultationDiagnosisId: item.consultationDiagnosisId ?? null,
              medicationName: item.medicationName,
              brandName: item.brandName ?? null,
              dose: item.dose,
              frequency: item.frequency,
              duration: item.duration,
              route: item.route ?? null,
              quantity: item.quantity ?? null,
              instructions: item.instructions ?? null,
              sortOrder: item.sortOrder ?? index,
            })),
          },
        },
        select: PRESCRIPTION_DETAIL_SELECT,
      });

      // 3d. Incrementar usageCount en sugerencias usadas (fire-and-forget)
      this.incrementSuggestionUsage(dto.items).catch((err) =>
        this.logger.warn('Error incrementando usageCount:', err),
      );

      return prescription;
    });
  }

  // ── DETALLE ────────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      select: PRESCRIPTION_DETAIL_SELECT,
    });
    if (!prescription) throw new NotFoundException('Receta no encontrada');
    return prescription;
  }

  // ── LISTAR POR PACIENTE ────────────────────────────────────────────────────

  async findByPatient(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    return this.prisma.prescription.findMany({
      where: { patientId },
      select: {
        id: true,
        folioNumber: true,
        status: true,
        doctorName: true,
        clinicName: true,
        pdfUrl: true,
        issuedAt: true,
        expiresAt: true,
        items: {
          select: { medicationName: true, dose: true, frequency: true },
          orderBy: {
            sortOrder: 'asc',
          } as Prisma.PrescriptionItemOrderByWithRelationInput,
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  // ── ACTUALIZAR ÍTEMS (solo en DRAFT) ──────────────────────────────────────

  /**
   * Reemplaza todos los ítems de una receta en DRAFT.
   * Estrategia replace-all: más simple y predecible para el frontend.
   */
  async update(id: string, dto: UpdatePrescriptionDTO) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      select: { id: true, status: true, consultationId: true },
    });
    if (!prescription) throw new NotFoundException('Receta no encontrada');
    if (prescription.status !== 'DRAFT') {
      throw new BadRequestException(
        `No se pueden editar los ítems de una receta con estado ${prescription.status}`,
      );
    }

    if (!dto.items?.length) {
      throw new BadRequestException(
        'La receta debe tener al menos un medicamento',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Eliminar ítems anteriores
      await tx.prescriptionItem.deleteMany({ where: { prescriptionId: id } });

      // Crear nuevos ítems
      await tx.prescriptionItem.createMany({
        data: dto.items!.map((item, index) => ({
          prescriptionId: id,
          catalogId: item.catalogId ?? null,
          consultationDiagnosisId: item.consultationDiagnosisId ?? null,
          medicationName: item.medicationName,
          brandName: item.brandName ?? null,
          dose: item.dose,
          frequency: item.frequency,
          duration: item.duration,
          route: item.route ?? null,
          quantity: item.quantity ?? null,
          instructions: item.instructions ?? null,
          sortOrder: item.sortOrder ?? index,
        })),
      });

      return tx.prescription.findUnique({
        where: { id },
        select: PRESCRIPTION_DETAIL_SELECT,
      });
    });
  }

  // ── EMITIR RECETA (DRAFT → ISSUED) ────────────────────────────────────────

  /**
   * Marca la receta como ISSUED.
   * En la Fase 5 aquí se generará el PDF y se subirá a Cloudinary.
   * Por ahora devuelve la receta con los datos para que el frontend
   * pueda renderizar su propia vista de impresión.
   */
  async issue(id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      select: { id: true, status: true, items: { select: { id: true } } },
    });
    if (!prescription) throw new NotFoundException('Receta no encontrada');
    if (prescription.status === 'ISSUED') {
      throw new ConflictException('La receta ya fue emitida');
    }
    if (prescription.status === 'CANCELLED') {
      throw new BadRequestException('No se puede emitir una receta cancelada');
    }
    if (!prescription.items.length) {
      throw new BadRequestException(
        'No se puede emitir una receta sin medicamentos',
      );
    }

    return this.prisma.prescription.update({
      where: { id },
      data: { status: 'ISSUED' },
      select: PRESCRIPTION_DETAIL_SELECT,
    });
  }

  // ── CANCELAR ───────────────────────────────────────────────────────────────

  async cancel(id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!prescription) throw new NotFoundException('Receta no encontrada');
    if (prescription.status === 'CANCELLED') {
      throw new ConflictException('La receta ya está cancelada');
    }

    return this.prisma.prescription.update({
      where: { id },
      data: { status: 'CANCELLED' },
      select: { id: true, folioNumber: true, status: true },
    });
  }

  // ── GUARDAR PDF (llamado desde PrescriptionsPdfService en Fase 5) ──────────

  async savePdf(id: string, pdfBuffer: Buffer): Promise<{ pdfUrl: string }> {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      select: { id: true, pdfPublicId: true },
    });
    if (!prescription) throw new NotFoundException('Receta no encontrada');

    // Eliminar PDF anterior si existe
    if (prescription.pdfPublicId) {
      await this.cloudinary.deleteByPublicId(prescription.pdfPublicId);
    }

    const publicId = `medisys/prescriptions/${id}`;
    const result = await this.cloudinary.uploadStream(
      pdfBuffer,
      'medisys/prescriptions',
      publicId,
    );

    await this.prisma.prescription.update({
      where: { id },
      data: {
        pdfUrl: result.secure_url,
        pdfPublicId: result.public_id,
        status: 'ISSUED',
      },
    });

    return { pdfUrl: result.secure_url };
  }

  // ── HELPERS PRIVADOS ───────────────────────────────────────────────────────

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

  /**
   * Incrementa el usageCount de las sugerencias que el médico aceptó.
   * Fire-and-forget — no bloquea la respuesta.
   */
  private async incrementSuggestionUsage(
    items: CreatePrescriptionDTO['items'],
  ): Promise<void> {
    const catalogIds = items
      .filter((i) => i.catalogId)
      .map((i) => i.catalogId!);

    if (!catalogIds.length) return;

    await this.prisma.icdMedicationSuggestion.updateMany({
      where: { medicationCatalogId: { in: catalogIds }, isActive: true },
      data: { usageCount: { increment: 1 } },
    });
  }
}

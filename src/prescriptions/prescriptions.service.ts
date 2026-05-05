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
import { PdfService } from 'src/pdf/pdf.service';
import {
  PRESCRIPTION_DETAIL_SELECT,
  PRESCRIPTION_VALIDITY_DAYS,
  SELECT_PRESCRIPTION_ISSUE,
} from './constants/prescription.select';
import { PrescriptionTemplateProps } from 'src/pdf/templates/prescription';

@Injectable()
export class PrescriptionsService {
  private readonly logger = new Logger(PrescriptionsService.name);

  constructor(
    private readonly cloudinary: CloudinaryService,
    private readonly pdfService: PdfService,
    private readonly prisma: PrismaService,
  ) {}

  // ── CREAR ──────────────────────────────────────────────────────────────────

  async create(dto: CreatePrescriptionDTO) {
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
              select: { name: true, address: true, phone: true, logoUrl: true },
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

    if (!dto.items?.length) {
      throw new BadRequestException(
        'La receta debe tener al menos un medicamento',
      );
    }

    const dc = consultation.doctorClinic;
    const profile = dc?.doctorProfile;
    const user = profile?.user;
    const clinic = dc?.clinic;

    const doctorFullName = [
      user?.firstName,
      user?.middleName,
      user?.lastNamePaternal,
      user?.lastNameMaternal,
    ]
      .filter(Boolean)
      .join(' ');

    // Datos base sin folio
    const baseData = {
      consultationId: dto.consultationId,
      patientId: consultation.patientId,
      doctorClinicId: consultation.doctorClinicId,
      status: 'DRAFT' as const,
      doctorName: profile?.fullTitle ?? doctorFullName,
      doctorLicense: profile?.professionalLicense ?? '',
      doctorSpecialty: profile?.specialty ?? null,
      clinicName: clinic?.name ?? '',
      clinicAddress: clinic?.address ?? null,
      clinicPhone: clinic?.phone ?? null,
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
    };

    // Bucle de reintentos ante P2002
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const folio = await this.getNextPrescriptionFolio();

        const result = await this.prisma.$transaction(async (tx) => {
          const issuedAt = new Date();
          const expiresAt = new Date(issuedAt);
          expiresAt.setDate(expiresAt.getDate() + PRESCRIPTION_VALIDITY_DAYS);

          const prescription = await tx.prescription.create({
            data: {
              folioNumber: folio,
              ...baseData,
              issuedAt,
              expiresAt,
            },
            select: PRESCRIPTION_DETAIL_SELECT,
          });

          return prescription;
        });

        this.incrementSuggestionUsage(dto.items).catch((err) =>
          this.logger.warn('Error incrementando usageCount:', err),
        );

        return result;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          if (attempt === MAX_RETRIES - 1) {
            throw new ConflictException(
              'Error de unicidad al crear la receta. Por favor, reintente.',
            );
          }
          await new Promise((resolve) =>
            setTimeout(resolve, 50 * (attempt + 1)),
          );
          continue;
        }
        this.logger.error('Error al crear receta:', err);
        throw err;
      }
    }

    throw new Error('No se pudo crear la receta después de varios intentos');
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
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  // ── ACTUALIZAR ÍTEMS (solo en DRAFT) ──────────────────────────────────────

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
      await tx.prescriptionItem.deleteMany({ where: { prescriptionId: id } });

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

  async issue(id: string, includeSignature = true) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      select: SELECT_PRESCRIPTION_ISSUE,
    });

    if (!prescription) throw new NotFoundException('Receta no encontrada');
    if (prescription.status === 'ISSUED')
      throw new ConflictException('La receta ya fue emitida');
    if (prescription.status === 'CANCELLED')
      throw new BadRequestException('No se puede emitir una receta cancelada');
    if (!prescription.items.length)
      throw new BadRequestException(
        'No se puede emitir una receta sin medicamentos',
      );

    // Calcular edad
    const birthDate = prescription.patient.birthDate;
    const age = new Date().getFullYear() - new Date(birthDate).getFullYear();

    const patientName = [
      prescription.patient.firstName,
      prescription.patient.middleName,
      prescription.patient.lastNamePaternal,
      prescription.patient.lastNameMaternal,
    ]
      .filter(Boolean)
      .join(' ');

    const diagnosesSummary =
      prescription.consultation?.diagnoses
        .map((d) => [d.icd10Code, d.description].filter(Boolean).join(' — '))
        .join('\n') || null;

    const props: PrescriptionTemplateProps = {
      clinicName: prescription.clinicName,
      clinicAddress: prescription.clinicAddress,
      clinicPhone: prescription.clinicPhone,
      clinicLogoUrl: prescription.doctorClinic?.clinic?.logoUrl ?? null,
      doctorName: prescription.doctorName,
      doctorLicense: prescription.doctorLicense,
      doctorSpecialty: prescription.doctorSpecialty,
      doctorSignatureUrl:
        prescription.doctorClinic?.doctorProfile?.signatureUrl ?? null,
      includeSignature,
      patientName,
      patientAge: age,
      patientGender: prescription.patient.gender,
      folioNumber: prescription.folioNumber,
      issuedAt: prescription.issuedAt.toISOString(),
      expiresAt: prescription.expiresAt.toISOString(),
      items: prescription.items,
      patientInstructions:
        prescription.consultation?.patientInstructions ?? null,
      diagnosesSummary,
    };

    const pdfBuffer = await this.pdfService.generatePrescription(props);
    const { pdfUrl } = await this.savePdf(id, pdfBuffer);

    return this.prisma.prescription.update({
      where: { id },
      data: { status: 'ISSUED', pdfUrl },
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

  // ── GUARDAR PDF ────────────────────────────────────────────────────────────

  async savePdf(id: string, pdfBuffer: Buffer): Promise<{ pdfUrl: string }> {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      select: { id: true, pdfPublicId: true },
    });
    if (!prescription) throw new NotFoundException('Receta no encontrada');

    if (prescription.pdfPublicId) {
      await this.cloudinary.deleteByPublicId(prescription.pdfPublicId);
    }

    const publicId = id;
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

  // ── UTILIDADES PRIVADAS ────────────────────────────────────────────────────

  /**
   * Obtiene el siguiente folio para recetas (REC-YYYY-NNNNNN)
   * basándose únicamente en el máximo real de la tabla.
   */
  private async getNextPrescriptionFolio(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REC-${year}-`;

    const last = await this.prisma.prescription.findFirst({
      where: { folioNumber: { startsWith: prefix } },
      orderBy: { folioNumber: 'desc' },
      select: { folioNumber: true },
    });

    let nextNumber = 1;
    if (last?.folioNumber) {
      const numericPart = parseInt(last.folioNumber.slice(prefix.length), 10);
      if (!isNaN(numericPart)) {
        nextNumber = numericPart + 1;
      }
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
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

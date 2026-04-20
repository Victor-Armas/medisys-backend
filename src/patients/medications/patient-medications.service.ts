// ─── src/patients/medications/patient-medications.service.ts ─────────────────
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

import { MEDICATION_SELECT } from '../constants/patient.select';
import {
  CreateMedicationDTO,
  UpdateMedicationDTO,
} from './create-medication.dto';

@Injectable()
export class PatientMedicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(patientId: string, dto: CreateMedicationDTO) {
    await this.assertPatientExists(patientId);

    return this.prisma.patientMedication.create({
      data: {
        patientId,
        catalogId: dto.catalogId ?? null,
        name: dto.name,
        dose: dto.dose ?? null,
        frequency: dto.frequency ?? null,
        isNonCoded: dto.isNonCoded ?? !dto.catalogId,
      },
      select: MEDICATION_SELECT,
    });
  }

  async findAll(patientId: string) {
    await this.assertPatientExists(patientId);

    return this.prisma.patientMedication.findMany({
      where: { patientId, isActive: true },
      select: MEDICATION_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(
    patientId: string,
    medicationId: string,
    dto: UpdateMedicationDTO,
  ) {
    const record = await this.findOneOrThrow(patientId, medicationId);

    return this.prisma.patientMedication.update({
      where: { id: record.id },
      data: { dose: dto.dose, frequency: dto.frequency },
      select: MEDICATION_SELECT,
    });
  }

  async remove(patientId: string, medicationId: string) {
    const record = await this.findOneOrThrow(patientId, medicationId);
    await this.prisma.patientMedication.update({
      where: { id: record.id },
      data: { isActive: false },
    });
  }

  private async assertPatientExists(patientId: string): Promise<void> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');
  }

  private async findOneOrThrow(patientId: string, medicationId: string) {
    const record = await this.prisma.patientMedication.findFirst({
      where: { id: medicationId, patientId, isActive: true },
      select: { id: true },
    });
    if (!record) throw new NotFoundException('Medicamento no encontrado');
    return record;
  }
}

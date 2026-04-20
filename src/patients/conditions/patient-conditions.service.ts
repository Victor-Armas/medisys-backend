// src/patients/conditions/patient-conditions.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

import { ConditionType } from '@generated/prisma/enums';
import { CONDITION_SELECT } from '../constants/patient.select';
import { CreateConditionDTO } from './dto/create-condition.dto';

@Injectable()
export class PatientConditionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CREATE ───────────────────────────────────────────────────────────────

  async create(patientId: string, dto: CreateConditionDTO) {
    await this.assertPatientExists(patientId);
    return this.prisma.patientCondition.create({
      data: {
        patientId,
        icd10Code: dto.icd10Code ?? null,
        description: dto.description,
        category: dto.category,
        type: dto.type ?? ConditionType.PATHOLOGICAL,
        familyMember: dto.familyMember ?? null,
        notes: dto.notes ?? null,
        isNonCoded: !dto.icd10Code,
      },
      select: CONDITION_SELECT,
    });
  }

  // ─── READ ─────────────────────────────────────────────────────────────────

  async findAll(patientId: string) {
    await this.assertPatientExists(patientId);

    return this.prisma.patientCondition.findMany({
      where: { patientId, isActive: true },
      select: CONDITION_SELECT,
      orderBy: [{ type: 'asc' }, { category: 'asc' }, { createdAt: 'asc' }],
    });
  }

  // ─── UPDATE NOTES ─────────────────────────────────────────────────────────

  async updateNotes(
    patientId: string,
    conditionId: string,
    notes: string | null,
  ) {
    const condition = await this.findOneOrThrow(patientId, conditionId);

    return this.prisma.patientCondition.update({
      where: { id: condition.id },
      data: { notes },
      select: CONDITION_SELECT,
    });
  }

  // ─── SOFT DELETE ──────────────────────────────────────────────────────────

  async remove(patientId: string, conditionId: string) {
    const condition = await this.findOneOrThrow(patientId, conditionId);

    await this.prisma.patientCondition.update({
      where: { id: condition.id },
      data: { isActive: false },
    });
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────

  private async assertPatientExists(patientId: string): Promise<void> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');
  }

  private async findOneOrThrow(patientId: string, conditionId: string) {
    const record = await this.prisma.patientCondition.findFirst({
      where: { id: conditionId, patientId, isActive: true },
      select: { id: true },
    });
    if (!record) throw new NotFoundException('Condición no encontrada');
    return record;
  }
}

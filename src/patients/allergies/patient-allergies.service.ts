import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAllergyDTO } from './dto/create-allergy.dto';
import { AllergySeverity } from '@generated/prisma/enums';
import { ALLERGY_SELECT } from '../constants/patient.select';

@Injectable()
export class PatientAllergiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(patientId: string, dto: CreateAllergyDTO) {
    await this.assertPatientExists(patientId);

    return this.prisma.patientAllergy.create({
      data: {
        patientId,
        substance: dto.substance,
        reaction: dto.reaction ?? null,
        severity: dto.severity ?? AllergySeverity.UNKNOWN,
      },
      select: ALLERGY_SELECT,
    });
  }

  async findAll(patientId: string) {
    await this.assertPatientExists(patientId);

    return this.prisma.patientAllergy.findMany({
      where: { patientId, isActive: true },
      select: ALLERGY_SELECT,
      orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async remove(patientId: string, allergyId: string) {
    const record = await this.findOneOrThrow(patientId, allergyId);
    await this.prisma.patientAllergy.update({
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

  private async findOneOrThrow(patientId: string, allergyId: string) {
    const record = await this.prisma.patientAllergy.findFirst({
      where: { id: allergyId, patientId, isActive: true },
      select: { id: true },
    });
    if (!record) throw new NotFoundException('Alergia no encontrada');
    return record;
  }
}

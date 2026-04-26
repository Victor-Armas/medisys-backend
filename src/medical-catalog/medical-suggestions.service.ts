// src/medical-catalog/medical-suggestions.service.ts

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSuggestionDTO } from './dto/create-suggestion.dto';
import { UpdateSuggestionDTO } from './dto/update-suggestion.dto';

@Injectable()
export class MedicalSuggestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSuggestionDTO) {
    // Verificar que el medicamento existe en el catálogo
    const med = await this.prisma.medicationCatalog.findUnique({
      where: { id: dto.medicationCatalogId },
      select: { id: true },
    });
    if (!med)
      throw new NotFoundException('Medicamento no encontrado en el catálogo');

    // Verificar duplicado
    const existing = await this.prisma.icdMedicationSuggestion.findUnique({
      where: {
        icd10Code_medicationCatalogId: {
          icd10Code: dto.icd10Code,
          medicationCatalogId: dto.medicationCatalogId,
        },
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe una sugerencia para este diagnóstico y medicamento',
      );
    }

    return this.prisma.icdMedicationSuggestion.create({
      data: {
        icd10Code: dto.icd10Code,
        medicationCatalogId: dto.medicationCatalogId,
        defaultDose: dto.defaultDose ?? null,
        defaultFrequency: dto.defaultFrequency ?? null,
        defaultDuration: dto.defaultDuration ?? null,
        defaultRoute: dto.defaultRoute ?? null,
        defaultQuantity: dto.defaultQuantity ?? null,
        priority: dto.priority ?? 10,
      },
    });
  }

  async findByIcd10(icd10Code: string) {
    return this.prisma.icdMedicationSuggestion.findMany({
      where: { icd10Code, isActive: true },
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
          },
        },
      },
      orderBy: [{ priority: 'asc' }, { usageCount: 'desc' }],
    });
  }

  async update(id: string, dto: UpdateSuggestionDTO) {
    const suggestion = await this.prisma.icdMedicationSuggestion.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!suggestion) throw new NotFoundException('Sugerencia no encontrada');

    return this.prisma.icdMedicationSuggestion.update({
      where: { id },
      data: {
        defaultDose: dto.defaultDose,
        defaultFrequency: dto.defaultFrequency,
        defaultDuration: dto.defaultDuration,
        defaultRoute: dto.defaultRoute,
        defaultQuantity: dto.defaultQuantity,
        priority: dto.priority,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string) {
    const suggestion = await this.prisma.icdMedicationSuggestion.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!suggestion) throw new NotFoundException('Sugerencia no encontrada');

    await this.prisma.icdMedicationSuggestion.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

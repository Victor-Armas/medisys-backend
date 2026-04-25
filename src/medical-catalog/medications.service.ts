import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MedicationSearchResult {
  id: string;
  name: string;
  rxnormCode: string | null;
  form: string | null;
  concentration: string | null;
}

@Injectable()
export class MedicationsService {
  private readonly logger = new Logger(MedicationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, limit = 10): Promise<MedicationSearchResult[]> {
    const clean = query.trim();
    if (clean.length < 2) return [];

    return this.prisma.medicationCatalog.findMany({
      where: {
        isActive: true,
        name: { contains: clean, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        description: true,
        rxnormCode: true,
        form: true,
        concentration: true,
      },
      orderBy: [{ searchCount: 'desc' }, { name: 'asc' }],
      take: Math.min(limit, 20),
    });
  }

  incrementSearchCount(id: string): void {
    this.prisma.medicationCatalog
      .update({ where: { id }, data: { searchCount: { increment: 1 } } })
      .catch((err: unknown) =>
        this.logger.warn(
          `Could not increment medication searchCount ${id}: ${String(err)}`,
        ),
      );
  }

  /**
   * Seeds/imports medication catalog from a plain-text file.
   * Format per line: GENERIC_NAME[\tRXNORM_CODE]
   */
  async importFromTxt(
    fileContent: string,
  ): Promise<{ imported: number; errors: number }> {
    const lines = fileContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0)
      throw new BadRequestException('El archivo está vacío');

    let imported = 0;
    let errors = 0;
    const BATCH = 200;

    for (let i = 0; i < lines.length; i += BATCH) {
      const batch = lines.slice(i, i + BATCH);

      const data = batch
        .map((line) => {
          const parts = line.split('\t');
          const name = parts[0]?.trim();
          const rxnormCode = parts[1]?.trim() || null;
          if (!name) return null;
          return { name, rxnormCode };
        })
        .filter(
          (r): r is { name: string; rxnormCode: string | null } => r !== null,
        );

      try {
        await this.prisma.medicationCatalog.createMany({
          data,
          skipDuplicates: true,
        });
        imported += data.length;
      } catch {
        errors += data.length;
      }
    }

    return { imported, errors };
  }
}

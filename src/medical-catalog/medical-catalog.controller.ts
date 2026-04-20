import {
  Body,
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { SearchCatalogDTO } from './dto/search-catalog.dto';
import { Icd10Service } from './icd10.service';
import { MedicationsService } from './medications.service';

@ApiTags('Medical Catalog')
@Controller('medical-catalog')
export class MedicalCatalogController {
  constructor(
    private readonly icd10Service: Icd10Service,
    private readonly medicationsService: MedicationsService,
  ) {}

  // ── ICD-10 Search (authenticated staff) ──────────────────────────────────

  @Get('icd10/search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR', 'RECEPTIONIST')
  searchIcd10(@Query() dto: SearchCatalogDTO) {
    return this.icd10Service.search(dto.q, dto.limit);
  }

  @Get('icd10/search/trauma')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR', 'RECEPTIONIST')
  searchIcd10Traima(@Query() dto: SearchCatalogDTO) {
    return this.icd10Service.searchTrauma(dto.q, dto.limit);
  }

  // ── Medication Search (authenticated staff) ───────────────────────────────

  @Get('medications/search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR', 'RECEPTIONIST')
  searchMedications(@Query() dto: SearchCatalogDTO) {
    return this.medicationsService.search(dto.q, dto.limit);
  }

  // ── ICD-10 Import (admin only) ────────────────────────────────────────────

  @Post('icd10/import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN_SYSTEM')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
    }),
  )
  importIcd10(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: 'text/plain' }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    const content = file.buffer.toString('utf-8');
    return this.icd10Service.importFromTxt(content);
  }

  // ── Medications Import (admin only) ──────────────────────────────────────

  @Post('medications/import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN_SYSTEM')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  importMedications(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: 'text/plain' }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    const content = file.buffer.toString('utf-8');
    return this.medicationsService.importFromTxt(content);
  }
}

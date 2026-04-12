import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { MedicalFilesService } from './medical-files.service';
import { CreateMedicalFileDTO } from './dto/create-medical-file.dto';
import { Request } from 'express';

// Los archivos médicos solo pueden ser gestionados por personal clínico
const CLINICAL_STAFF = ['ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR'] as const;

interface AuthenticatedRequest extends Request {
  user: { id: string; role: string };
}

@ApiTags('Patient Medical Files')
@Controller('patients/:patientId/medical-files')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicalFilesController {
  constructor(private readonly medicalFilesService: MedicalFilesService) {}

  /**
   * POST /api/patients/:patientId/medical-files
   * multipart/form-data: file + category + description?
   */
  @Post()
  @Roles(...CLINICAL_STAFF)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB — validación secundaria en el service
        files: 1,
      },
    }),
  )
  upload(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateMedicalFileDTO,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.medicalFilesService.upload(patientId, file, dto, req.user.id);
  }

  /**
   * GET /api/patients/:patientId/medical-files
   */
  @Get()
  @Roles(...CLINICAL_STAFF)
  findAll(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.medicalFilesService.findAll(patientId);
  }

  /**
   * DELETE /api/patients/:patientId/medical-files/:fileId
   */
  @Delete(':fileId')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    return this.medicalFilesService.delete(patientId, fileId);
  }
}

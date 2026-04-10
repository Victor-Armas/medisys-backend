// ─── sepomex.controller.ts ────────────────────────────────────────────────────

import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { SepomexService } from './sepomex.service';

@ApiTags('Sepomex')
@Controller('sepomex')
export class SepomexController {
  constructor(private sepomexService: SepomexService) {}

  // GET /api/sepomex/states — público (se usa en formularios de dirección)
  @Get('states')
  getStates() {
    return this.sepomexService.getStates();
  }

  // GET /api/sepomex/municipalities?stateId=
  @Get('municipalities')
  getMunicipalities(@Query('stateId') stateId: string) {
    return this.sepomexService.getMunicipalities(stateId);
  }

  // GET /api/sepomex/postal-code/:code
  // Devuelve municipio, estado y colonias para el CP dado
  @Get('postal-code/:code')
  getByPostalCode(@Param('code') code: string) {
    return this.sepomexService.getByPostalCode(code);
  }

  // POST /api/sepomex/import — solo ADMIN
  // Carga el archivo sepomex.txt para actualizar el catálogo
  // multipart/form-data — field: "file"
  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN_SYSTEM')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB — el archivo completo es ~30 MB
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.endsWith('.txt')) {
          cb(new Error('Solo se acepta el archivo sepomex.txt'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  importCatalog(@UploadedFile() file: Express.Multer.File) {
    const content = file.buffer.toString('latin1'); // El archivo SEPOMEX usa encoding Latin-1
    return this.sepomexService.importFromTxt(content);
  }
}

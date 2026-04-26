// src/medical-catalog/medical-suggestions.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { CreateSuggestionDTO } from './dto/create-suggestion.dto';
import { MedicalSuggestionsService } from './medical-suggestions.service';
import { UpdateSuggestionDTO } from './dto/update-suggestion.dto';

@ApiTags('Medical Suggestions')
@Controller('medical-catalog/suggestions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicalSuggestionsController {
  constructor(private readonly service: MedicalSuggestionsService) {}

  /** POST /api/medical-catalog/suggestions — Crear sugerencia manualmente */
  @Post()
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR')
  create(@Body() dto: CreateSuggestionDTO) {
    return this.service.create(dto);
  }

  /** GET /api/medical-catalog/suggestions?icd10=J00 — Listar sugerencias */
  @Get()
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR')
  findByIcd10(@Query('icd10') icd10: string) {
    return this.service.findByIcd10(icd10);
  }

  /** PATCH /api/medical-catalog/suggestions/:id — Editar defaults */
  @Patch(':id')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSuggestionDTO,
  ) {
    return this.service.update(id, dto);
  }

  /** DELETE /api/medical-catalog/suggestions/:id — Desactivar sugerencia */
  @Delete(':id')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}

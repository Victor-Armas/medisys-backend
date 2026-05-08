import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { Roles } from '@auth/decorators/roles.decorator';
import { CreateUserDTO } from './dto/create-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { RequestWithUser } from '@auth/auth.controller';

@Controller('users')
// Ambos guards se aplican a todos los endpoints de este controller
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR')
  create(@Body() dto: CreateUserDTO) {
    // El controller solo delega — la lógica vive en el service
    return this.usersService.create(dto);
  }

  // ─────────────────────────────────────────────────────────────
  // GET /api/users
  // Lista todos los usuarios activos excepto doctores.
  // Solamente se listan los que tienen el rol de
  // ─────────────────────────────────────────────────────────────

  @Get()
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR', 'RECEPTIONIST')
  findAll(@Req() req: RequestWithUser) {
    return this.usersService.findAll(req.user.role);
  }

  // ─────────────────────────────────────────────────────────────
  // GET /api/users/:id
  // Devuelve un usuario específico por su userId. (no doctores ni main doctor)
  // ParseUUIDPipe valida el formato del UUID antes de llegar
  // al servicio — si no es un UUID válido devuelve 400 automático.
  // ─────────────────────────────────────────────────────────────
  @Get(':id')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR', 'RECEPTIONIST', 'PATIENT')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  // PATCH /api/users/:id
  @Patch(':id')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDTO) {
    return this.usersService.update(id, dto);
  }

  // POST /api/users/:id/photo
  // multipart/form-data — field name: "file"
  @Post(':id/photo')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR', 'DOCTOR')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new Error('Solo se permiten imágenes'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.usersService.uploadPhoto(id, file.buffer);
  }

  // POST /api/users/:id/reset-password
  // Solo ADMIN_SYSTEM y MAIN_DOCTOR pueden resetear contraseñas
  @Post(':id/reset-password')
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR')
  resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.resetPassword(id);
  }
}

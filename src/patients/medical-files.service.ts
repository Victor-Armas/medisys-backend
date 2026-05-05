import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateMedicalFileDTO } from './dto/create-medical-file.dto';
import { MEDICAL_FILE_SELECT } from './constants/patient.select';

// 10 MB limit para archivos médicos (PDFs pueden ser grandes)
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

type CloudinaryMedicalFolder = 'medisys/patients/medical-files';

@Injectable()
export class MedicalFilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // ─── UPLOAD ───────────────────────────────────────────────────────────────

  async upload(
    patientId: string,
    file: Express.Multer.File,
    dto: CreateMedicalFileDTO,
    uploadedById: string,
  ) {
    // 1. Validar paciente
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, isActive: true },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    if (!patient.isActive)
      throw new ForbiddenException('El paciente está inactivo');

    // 2. Validar archivo
    this.validateFile(file);

    // 3. Subir a Cloudinary
    const folder: CloudinaryMedicalFolder = 'medisys/patients/medical-files';
    const publicId = `${folder}/${patientId}/${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const uploaded = await this.cloudinary.uploadStream(
      file.buffer,
      folder,
      publicId,
    );

    // 4. Optional: validate consultation linkage
    let consultationId: string | null = null;
    if (dto.consultationId) {
      const c = await this.prisma.consultation.findUnique({
        where: { id: dto.consultationId },
        select: { id: true, patientId: true },
      });
      if (!c) throw new NotFoundException('Consulta no encontrada');
      if (c.patientId !== patientId) {
        throw new ForbiddenException(
          'La consulta no pertenece a este paciente',
        );
      }
      consultationId = c.id;
    }

    // 5. Persistir en DB
    return this.prisma.patientMedicalFile.create({
      data: {
        patientId,
        consultationId,
        category: dto.category,
        description: dto.description,
        fileName: file.originalname,
        fileUrl: uploaded.secure_url,
        publicId: uploaded.public_id,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedById,
      },
      select: MEDICAL_FILE_SELECT,
    });
  }

  // ─── LIST ─────────────────────────────────────────────────────────────────

  async findAll(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    return this.prisma.patientMedicalFile.findMany({
      where: { patientId },
      select: MEDICAL_FILE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── DELETE ───────────────────────────────────────────────────────────────

  async delete(patientId: string, fileId: string): Promise<void> {
    const file = await this.prisma.patientMedicalFile.findFirst({
      where: { id: fileId, patientId },
      select: { id: true, publicId: true },
    });

    if (!file) throw new NotFoundException('Archivo no encontrado');

    // Eliminar de Cloudinary (no crítico si falla — DB se actualiza igual)
    await this.cloudinary.deleteByPublicId(file.publicId);

    await this.prisma.patientMedicalFile.delete({ where: { id: fileId } });
  }

  // ─── PRIVATE VALIDATION ───────────────────────────────────────────────────

  private validateFile(file: Express.Multer.File): void {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        `Tipo de archivo no permitido: ${file.mimetype}. Solo se aceptan PDF e imágenes (JPEG, PNG, WebP).`,
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new PayloadTooLargeException(
        `El archivo excede el tamaño máximo permitido de 10 MB.`,
      );
    }
  }
}

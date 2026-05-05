import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

export type CloudinaryFolder =
  | 'medisys/doctors/photos'
  | 'medisys/doctors/signatures'
  | 'medisys/clinics/logos'
  | 'medisys/patients/medical-files'
  | 'medisys/prescriptions';

@Injectable()
export class CloudinaryService {
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  // ─── Upload ───────────────────────────────────────────────────────────────

  async uploadStream(
    buffer: Buffer,
    folder: CloudinaryFolder,
    publicId: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          overwrite: true,
          resource_type: 'auto',
          image_metadata: false,
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new InternalServerErrorException(
                `Error al subir archivo a Cloudinary: ${error?.message ?? 'unknown'}`,
              ),
            );
          } else {
            resolve(result);
          }
        },
      );

      Readable.from(buffer).pipe(stream);
    });
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async deleteByPublicId(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch {
      // Non-critical: log but do not throw — the DB record will be updated regardless
      console.warn(`[Cloudinary] Could not delete asset: ${publicId}`);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Builds a deterministic public_id for a given resource.
   * Example: doctors/photos/doctor_abc123
   */
  buildPublicId(folder: CloudinaryFolder, entityId: string): string {
    return `${folder}/${entityId}`;
  }
}

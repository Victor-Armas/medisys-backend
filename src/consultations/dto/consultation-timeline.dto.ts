import { IsOptional, IsUUID } from 'class-validator';

export class ConsultationTimelineQueryDTO {
  /** When provided, only include files linked to this consultation (for debugging). */
  @IsOptional()
  @IsUUID()
  consultationId?: string;
}


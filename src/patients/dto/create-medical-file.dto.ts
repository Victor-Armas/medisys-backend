import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum MedicalFileCategory {
  LAB_RESULTS = 'LAB_RESULTS', // Resultados de laboratorio
  IMAGING = 'IMAGING', // Radiografías, US, TC, RM
  PRESCRIPTION = 'PRESCRIPTION', // Recetas previas
  REFERRAL = 'REFERRAL', // Interconsultas / referencias
  SURGERY_REPORT = 'SURGERY_REPORT', // Informes quirúrgicos
  PATHOLOGY = 'PATHOLOGY', // Resultados de patología
  OTHER = 'OTHER',
}

export class CreateMedicalFileDTO {
  @IsEnum(MedicalFileCategory, { message: 'Categoría de archivo inválida' })
  category: MedicalFileCategory;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

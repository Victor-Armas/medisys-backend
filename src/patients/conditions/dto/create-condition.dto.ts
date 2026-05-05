// src/patients/conditions/dto/create-condition.dto.ts
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  ConditionCategory,
  ConditionType,
  FamilyMember,
} from '@generated/prisma/enums';

export class CreateConditionDTO {
  /** ICD-10 code — nullable to allow free-text entries. */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  icd10Code?: string;

  /**
   * When true, the entry is a free-text condition not linked to ICD-10.
   * Optional: backend can derive it from the absence of icd10Code.
   */
  @IsOptional()
  @IsBoolean()
  isNonCoded?: boolean;

  /**
   * Human-readable name.
   * Required always: sourced from ICD-10 lookup or typed freely.
   */
  @IsString()
  @IsNotEmpty({ message: 'La descripción del diagnóstico es obligatoria' })
  @MaxLength(300)
  description: string;

  @IsEnum(ConditionCategory)
  category: ConditionCategory;

  @IsOptional()
  @IsEnum(ConditionType)
  type?: ConditionType;

  /** Required when type = FAMILY. */
  @ValidateIf((o: CreateConditionDTO) => o.type === ConditionType.FAMILY)
  @IsEnum(FamilyMember, {
    message:
      'Se requiere especificar el familiar para antecedentes heredofamiliares',
  })
  familyMember?: FamilyMember;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

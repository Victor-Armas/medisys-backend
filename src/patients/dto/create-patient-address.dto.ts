import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class CreatePatientAddressDTO {
  @IsOptional()
  @IsString()
  country?: string; // default "MX"

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  // ── México ────────────────────────────────────────────────
  // Tipamos 'o' y aseguramos retorno booleano
  @ValidateIf((o: CreatePatientAddressDTO) => !o.country || o.country === 'MX')
  @IsOptional()
  @IsUUID()
  postalCodeId?: string;

  @ValidateIf((o: CreatePatientAddressDTO) => !o.country || o.country === 'MX')
  @IsOptional()
  @IsUUID()
  neighborhoodId?: string;

  @ValidateIf((o: CreatePatientAddressDTO) => !o.country || o.country === 'MX')
  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  extNumber?: string;

  @IsOptional()
  @IsString()
  intNumber?: string;

  // ── Extranjero ────────────────────────────────────────────
  // Usamos Boolean() para evitar que el `&&` retorne undefined (que ESLint lee como any)
  @ValidateIf((o: CreatePatientAddressDTO) =>
    Boolean(o.country && o.country !== 'MX'),
  )
  @IsNotEmpty({
    message: 'El estado es obligatorio para direcciones extranjeras',
  })
  @IsString()
  foreignState?: string;

  @ValidateIf((o: CreatePatientAddressDTO) =>
    Boolean(o.country && o.country !== 'MX'),
  )
  @IsNotEmpty({
    message: 'La ciudad es obligatoria para direcciones extranjeras',
  })
  @IsString()
  foreignCity?: string;

  @IsOptional()
  @IsString()
  foreignPostalCode?: string;

  @IsOptional()
  @IsString()
  foreignAddressLine?: string;
}

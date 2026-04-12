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

  // ── México ────────────────────────────────────────────────municipality
  // Tipamos 'o' y aseguramos retorno booleano
  @ValidateIf((o: CreatePatientAddressDTO) => !o.country || o.country === 'MX') //CP
  @IsOptional()
  @IsUUID()
  postalCodeId?: string;

  @ValidateIf((o: CreatePatientAddressDTO) => !o.country || o.country === 'MX') //Colonia
  @IsOptional()
  @IsUUID()
  neighborhoodId?: string;

  @ValidateIf((o: CreatePatientAddressDTO) => !o.country || o.country === 'MX') //Calle
  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  extNumber?: string;

  @IsOptional()
  @IsString()
  intNumber?: string;

  @IsOptional() //estado
  @IsString()
  state?: string;

  @IsOptional() //municipio
  @IsString()
  municipality?: string;

  // ── Extranjero ────────────────────────────────────────────
  // Usamos Boolean() para evitar que el `&&` retorne undefined (que ESLint lee como any)
  @ValidateIf((o: CreatePatientAddressDTO) =>
    Boolean(o.country && o.country !== 'MX'),
  )
  @IsNotEmpty({ message: 'El estado es obligatorio para extranjeros' })
  @IsString()
  foreignState?: string; // Ejemplo: "TX" o "Texas"

  @ValidateIf((o: CreatePatientAddressDTO) =>
    Boolean(o.country && o.country !== 'MX'),
  )
  @IsNotEmpty({ message: 'La ciudad es obligatoria para extranjeros' })
  @IsString()
  foreignCity?: string; // Ejemplo: "Houston"

  @IsOptional()
  @IsString()
  foreignPostalCode?: string; // Ejemplo: "77001"

  @IsOptional()
  @IsString()
  foreignAddressLine?: string; // Aquí es donde pondrías la "Línea 2" (Apt, Suite, etc.)
}

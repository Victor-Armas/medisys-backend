import { IsOptional, IsString, MaxLength, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchCatalogDTO {
  @IsString()
  @MaxLength(100)
  q: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

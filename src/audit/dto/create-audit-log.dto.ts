import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  @IsNotEmpty()
  level: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  details?: string;
}

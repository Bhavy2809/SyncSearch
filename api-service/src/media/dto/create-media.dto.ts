import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength } from 'class-validator';

export class CreateMediaDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename: string;

  @IsOptional()
  mimeType?: string; // Accept any MIME type (no validation)

  @IsOptional()
  filesize?: number;
}

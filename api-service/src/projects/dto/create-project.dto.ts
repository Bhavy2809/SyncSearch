import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MaxLength(100, { message: 'Project name cannot be longer than 100 characters' })
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Description cannot be longer than 500 characters' })
  description?: string;
}

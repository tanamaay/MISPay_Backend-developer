import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobType } from '../entities/job.entity';

export class CreateJobDto {
  @ApiProperty({
    description: 'Job name',
    example: 'Daily Email Report',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Job type',
    enum: JobType,
    example: JobType.EMAIL_NOTIFICATION,
  })
  @IsEnum(JobType)
  @IsNotEmpty()
  type: JobType;

  @ApiPropertyOptional({
    description: 'Job description',
    example: 'Sends daily email reports to all users',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Schedule expression (cron-like or interval)',
    example: '*/5 * * * *',
    examples: [
      { value: '*/5 * * * *', description: 'Every 5 minutes' },
      { value: '0 9 * * *', description: 'Daily at 9 AM' },
      { value: 'PT5M', description: 'Every 5 minutes (ISO 8601)' },
    ],
  })
  @IsString()
  @IsNotEmpty()
  schedule: string;

  @ApiPropertyOptional({
    description: 'Additional job metadata',
    example: { recipients: ['user@example.com'], template: 'daily-report' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}


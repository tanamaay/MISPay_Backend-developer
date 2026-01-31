import { ApiProperty } from '@nestjs/swagger';
import { JobType, JobStatus } from '../entities/job.entity';

export class JobResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Daily Email Report' })
  name: string;

  @ApiProperty({ enum: JobType, example: JobType.EMAIL_NOTIFICATION })
  type: JobType;

  @ApiProperty({ enum: JobStatus, example: JobStatus.ACTIVE })
  status: JobStatus;

  @ApiProperty({ example: 'Sends daily email reports to all users', required: false })
  description?: string;

  @ApiProperty({ example: '*/5 * * * *' })
  schedule: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z', required: false })
  lastRunAt?: Date;

  @ApiProperty({ example: '2024-01-15T10:35:00Z', required: false })
  nextRunAt?: Date;

  @ApiProperty({ example: { recipients: ['user@example.com'] }, required: false })
  metadata?: Record<string, any>;

  @ApiProperty({ example: 10 })
  runCount: number;

  @ApiProperty({ example: 0 })
  failureCount: number;

  @ApiProperty({ example: null, required: false })
  lastError?: string;

  @ApiProperty({ example: '2024-01-15T10:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:00:00Z' })
  updatedAt: Date;
}


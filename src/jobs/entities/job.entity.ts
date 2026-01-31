import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum JobType {
  EMAIL_NOTIFICATION = 'email_notification',
  NUMBER_CRUNCHING = 'number_crunching',
  DATA_PROCESSING = 'data_processing',
  REPORT_GENERATION = 'report_generation',
}

export enum JobStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('jobs')
@Index(['status', 'nextRunAt']) // Composite index for scheduler queries
@Index(['status']) // Index for filtering by status
@Index(['nextRunAt']) // Index for scheduler lookups
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: JobType,
    default: JobType.EMAIL_NOTIFICATION,
  })
  type: JobType;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.ACTIVE,
  })
  status: JobStatus;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100 })
  schedule: string; // Cron-like expression or interval (e.g., "*/5 * * * *" or "PT5M")

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  runCount: number;

  @Column({ type: 'int', default: 0 })
  failureCount: number;

  @Column({ type: 'text', nullable: true })
  lastError: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


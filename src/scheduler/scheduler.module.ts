import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { JobExecutorService } from './job-executor.service';
import { Job } from '../jobs/entities/job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Job])],
  providers: [SchedulerService, JobExecutorService],
  exports: [SchedulerService],
})
export class SchedulerModule {}


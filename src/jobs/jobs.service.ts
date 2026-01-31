import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStatus } from './entities/job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { SchedulerService } from '../scheduler/scheduler.service';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    private readonly schedulerService: SchedulerService,
  ) {}

  async create(createJobDto: CreateJobDto): Promise<Job> {
    try {
      const job = this.jobRepository.create(createJobDto);
      const savedJob = await this.jobRepository.save(job);

      // Calculate next run time
      const nextRunAt = this.schedulerService.calculateNextRun(
        savedJob.schedule,
      );
      savedJob.nextRunAt = nextRunAt;
      await this.jobRepository.save(savedJob);

      // Schedule the job
      await this.schedulerService.scheduleJob(savedJob);

      return savedJob;
    } catch (error) {
      throw new BadRequestException(
        `Failed to create job: ${error.message}`,
      );
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 50,
    status?: JobStatus,
  ): Promise<{ jobs: Job[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const queryBuilder = this.jobRepository.createQueryBuilder('job');

    if (status) {
      queryBuilder.where('job.status = :status', { status });
    }

    const [jobs, total] = await queryBuilder
      .orderBy('job.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      jobs,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Job> {
    // Use query builder for better performance with indexes
    const job = await this.jobRepository
      .createQueryBuilder('job')
      .where('job.id = :id', { id })
      .getOne();

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return job;
  }

  async update(id: string, updateJobDto: UpdateJobDto): Promise<Job> {
    const job = await this.findOne(id);

    // If schedule is updated, reschedule the job
    if (updateJobDto.schedule && updateJobDto.schedule !== job.schedule) {
      await this.schedulerService.unscheduleJob(job.id);
      Object.assign(job, updateJobDto);
      const nextRunAt = this.schedulerService.calculateNextRun(job.schedule);
      job.nextRunAt = nextRunAt;
      await this.jobRepository.save(job);
      await this.schedulerService.scheduleJob(job);
    } else {
      Object.assign(job, updateJobDto);
      await this.jobRepository.save(job);
    }

    return job;
  }

  async remove(id: string): Promise<void> {
    const job = await this.findOne(id);
    await this.schedulerService.unscheduleJob(job.id);
    await this.jobRepository.remove(job);
  }

  async pause(id: string): Promise<Job> {
    const job = await this.findOne(id);
    job.status = JobStatus.PAUSED;
    await this.schedulerService.unscheduleJob(job.id);
    return this.jobRepository.save(job);
  }

  async resume(id: string): Promise<Job> {
    const job = await this.findOne(id);
    if (job.status === JobStatus.PAUSED) {
      job.status = JobStatus.ACTIVE;
      const nextRunAt = this.schedulerService.calculateNextRun(job.schedule);
      job.nextRunAt = nextRunAt;
      await this.jobRepository.save(job);
      await this.schedulerService.scheduleJob(job);
    }
    return job;
  }
}


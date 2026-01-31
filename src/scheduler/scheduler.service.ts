import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStatus } from '../jobs/entities/job.entity';
import { JobExecutorService } from './job-executor.service';

interface ScheduledJob {
  id: string;
  nextRunAt: Date;
  timeoutId: NodeJS.Timeout;
}

interface ExecutingJob {
  id: string;
  startTime: Date;
}

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private scheduledJobs: Map<string, ScheduledJob> = new Map();
  private executingJobs: Map<string, ExecutingJob> = new Map(); // Track currently executing jobs
  private readonly checkInterval = 60000; // Check every minute
  private intervalId: NodeJS.Timeout;

  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    private readonly jobExecutorService: JobExecutorService,
  ) {}

  async onModuleInit() {
    // Load all active jobs from database on startup
    await this.loadActiveJobs();
    
    // Start the scheduler loop
    this.startScheduler();
    this.logger.log('Scheduler service initialized');
  }

  async onModuleDestroy() {
    // Clear all scheduled jobs
    this.scheduledJobs.forEach((scheduledJob) => {
      clearTimeout(scheduledJob.timeoutId);
    });
    this.scheduledJobs.clear();
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    this.logger.log('Scheduler service destroyed');
  }

  private async loadActiveJobs() {
    try {
      // Use query builder with index for better performance
      const activeJobs = await this.jobRepository
        .createQueryBuilder('job')
        .where('job.status = :status', { status: JobStatus.ACTIVE })
        .getMany();

      // Batch update jobs without nextRunAt
      const jobsToUpdate = activeJobs.filter((job) => !job.nextRunAt);
      if (jobsToUpdate.length > 0) {
        for (const job of jobsToUpdate) {
          job.nextRunAt = this.calculateNextRun(job.schedule);
        }
        await this.jobRepository.save(jobsToUpdate);
      }

      // Schedule all jobs
      for (const job of activeJobs) {
        await this.scheduleJob(job);
      }

      this.logger.log(`Loaded ${activeJobs.length} active jobs`);
    } catch (error) {
      this.logger.error(`Error loading active jobs: ${error.message}`);
    }
  }

  private startScheduler() {
    // Run scheduler check every minute
    this.intervalId = setInterval(() => {
      this.checkAndExecuteJobs();
    }, this.checkInterval);
  }

  private async checkAndExecuteJobs() {
    const now = new Date();
    const jobsToExecute: Job[] = [];

    // Find jobs that should run now (only if not already executing)
    for (const [jobId, scheduledJob] of this.scheduledJobs.entries()) {
      // Skip if already executing
      if (this.executingJobs.has(jobId)) {
        continue;
      }

      if (scheduledJob.nextRunAt <= now) {
        try {
          // Use query builder for better performance
          const job = await this.jobRepository
            .createQueryBuilder('job')
            .where('job.id = :id', { id: jobId })
            .andWhere('job.status = :status', { status: JobStatus.ACTIVE })
            .getOne();
          
          if (job) {
            // Remove from scheduled jobs to prevent duplicate execution
            this.unscheduleJob(jobId);
            jobsToExecute.push(job);
          }
        } catch (error) {
          this.logger.error(`Error fetching job ${jobId}: ${error.message}`);
        }
      }
    }

    // Execute jobs in parallel for better performance (with concurrency limit)
    const concurrencyLimit = 10;
    for (let i = 0; i < jobsToExecute.length; i += concurrencyLimit) {
      const batch = jobsToExecute.slice(i, i + concurrencyLimit);
      await Promise.all(batch.map((job) => this.executeJob(job)));
    }
  }

  async scheduleJob(job: Job): Promise<void> {
    if (job.status !== JobStatus.ACTIVE) {
      return;
    }

    // Unschedule if already scheduled
    this.unscheduleJob(job.id);

    const nextRunAt = job.nextRunAt || this.calculateNextRun(job.schedule);
    const now = new Date();
    const delay = Math.max(0, nextRunAt.getTime() - now.getTime());

    const timeoutId = setTimeout(async () => {
      // Remove from scheduled jobs before executing to prevent duplicate execution
      this.scheduledJobs.delete(job.id);
      await this.executeJob(job);
    }, delay);

    this.scheduledJobs.set(job.id, {
      id: job.id,
      nextRunAt,
      timeoutId,
    });

    this.logger.log(
      `Scheduled job ${job.name} (${job.id}) to run at ${nextRunAt.toISOString()}`,
    );
  }

  async unscheduleJob(jobId: string): Promise<void> {
    const scheduledJob = this.scheduledJobs.get(jobId);
    if (scheduledJob) {
      clearTimeout(scheduledJob.timeoutId);
      this.scheduledJobs.delete(jobId);
      this.logger.log(`Unscheduled job ${jobId}`);
    }
  }

  private async executeJob(job: Job): Promise<void> {
    // Prevent duplicate execution
    if (this.executingJobs.has(job.id)) {
      this.logger.warn(`Job ${job.id} is already executing, skipping duplicate execution`);
      return;
    }

    // Mark as executing
    this.executingJobs.set(job.id, { id: job.id, startTime: new Date() });

    try {
      this.logger.log(`Executing job ${job.name} (${job.id})`);

      // Reload job from database to get latest state
      const freshJob = await this.jobRepository.findOne({ where: { id: job.id } });
      if (!freshJob || freshJob.status !== JobStatus.ACTIVE) {
        this.logger.warn(`Job ${job.id} is no longer active, skipping execution`);
        this.executingJobs.delete(job.id);
        return;
      }

      // Update last run time
      freshJob.lastRunAt = new Date();
      freshJob.runCount += 1;

      // Execute the job
      await this.jobExecutorService.execute(freshJob);

      // Calculate next run time
      const nextRunAt = this.calculateNextRun(freshJob.schedule);
      freshJob.nextRunAt = nextRunAt;
      freshJob.lastError = null;

      // Save job state
      await this.jobRepository.save(freshJob);

      // Reschedule for next run
      await this.scheduleJob(freshJob);

      this.logger.log(
        `Job ${freshJob.name} executed successfully. Next run: ${nextRunAt.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(`Error executing job ${job.id}: ${error.message}`);
      
      // Reload job to get latest state
      const freshJob = await this.jobRepository.findOne({ where: { id: job.id } });
      if (freshJob) {
        // Update failure count
        freshJob.failureCount += 1;
        freshJob.lastError = error.message;
        await this.jobRepository.save(freshJob);

        // Reschedule even on failure (with exponential backoff for repeated failures)
        const backoffDelay = Math.min(
          Math.pow(2, freshJob.failureCount) * 60000,
          3600000,
        ); // Max 1 hour
        const nextRunAt = new Date(Date.now() + backoffDelay);
        freshJob.nextRunAt = nextRunAt;
        await this.jobRepository.save(freshJob);
        await this.scheduleJob(freshJob);
      }
    } finally {
      // Remove from executing jobs
      this.executingJobs.delete(job.id);
    }
  }

  calculateNextRun(schedule: string): Date {
    const now = new Date();

    // Check if it's an ISO 8601 duration (e.g., PT5M, PT1H)
    if (schedule.startsWith('PT')) {
      return this.calculateNextRunFromInterval(schedule, now);
    }

    // Parse cron-like expression
    return this.calculateNextRunFromCron(schedule, now);
  }

  private calculateNextRunFromInterval(interval: string, from: Date): Date {
    // Parse ISO 8601 duration (PT5M = 5 minutes, PT1H = 1 hour, etc.)
    const match = interval.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) {
      throw new Error(`Invalid interval format: ${interval}`);
    }

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    const totalMs =
      hours * 3600000 + minutes * 60000 + seconds * 1000;

    if (totalMs === 0) {
      throw new Error('Interval must be greater than 0');
    }

    return new Date(from.getTime() + totalMs);
  }

  private calculateNextRunFromCron(cronExpression: string, from: Date): Date {
    // Simple cron parser: "*/5 * * * *" format
    // Format: minute hour day month weekday
    const parts = cronExpression.trim().split(/\s+/);
    
    if (parts.length !== 5) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    const [minute, hour, day, month, weekday] = parts;
    const nextRun = new Date(from);
    nextRun.setSeconds(0, 0);

    // Increment by 1 minute initially
    nextRun.setMinutes(nextRun.getMinutes() + 1);

    let attempts = 0;
    const maxAttempts = 10080; // 7 days in minutes

    while (attempts < maxAttempts) {
      const matchesMinute = this.matchesCronField(minute, nextRun.getMinutes());
      const matchesHour = this.matchesCronField(hour, nextRun.getHours());
      const matchesDay = this.matchesCronField(day, nextRun.getDate());
      const matchesMonth = this.matchesCronField(month, nextRun.getMonth() + 1);
      const matchesWeekday = this.matchesCronField(
        weekday,
        nextRun.getDay(),
      );

      if (
        matchesMinute &&
        matchesHour &&
        matchesDay &&
        matchesMonth &&
        matchesWeekday
      ) {
        return nextRun;
      }

      nextRun.setMinutes(nextRun.getMinutes() + 1);
      attempts++;
    }

    throw new Error(
      `Could not find next run time for cron: ${cronExpression}`,
    );
  }

  private matchesCronField(field: string, value: number): boolean {
    // "*" matches all values
    if (field === '*') {
      return true;
    }

    // "*/n" matches every n values
    const stepMatch = field.match(/^\*\/(\d+)$/);
    if (stepMatch) {
      const step = parseInt(stepMatch[1], 10);
      return value % step === 0;
    }

    // Exact number
    if (field.match(/^\d+$/)) {
      return parseInt(field, 10) === value;
    }

    // Range: "n-m"
    const rangeMatch = field.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      return value >= start && value <= end;
    }

    // List: "n,m,o"
    if (field.includes(',')) {
      const values = field.split(',').map((v) => parseInt(v.trim(), 10));
      return values.includes(value);
    }

    return false;
  }
}


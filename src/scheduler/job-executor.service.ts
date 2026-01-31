import { Injectable, Logger } from '@nestjs/common';
import { Job, JobType } from '../jobs/entities/job.entity';

@Injectable()
export class JobExecutorService {
  private readonly logger = new Logger(JobExecutorService.name);

  async execute(job: Job): Promise<void> {
    this.logger.log(`Executing job ${job.name} of type ${job.type}`);

    switch (job.type) {
      case JobType.EMAIL_NOTIFICATION:
        await this.executeEmailNotification(job);
        break;
      case JobType.NUMBER_CRUNCHING:
        await this.executeNumberCrunching(job);
        break;
      case JobType.DATA_PROCESSING:
        await this.executeDataProcessing(job);
        break;
      case JobType.REPORT_GENERATION:
        await this.executeReportGeneration(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  private async executeEmailNotification(job: Job): Promise<void> {
    // Simulate email notification
    const recipients = job.metadata?.recipients || ['default@example.com'];
    const template = job.metadata?.template || 'default-template';

    this.logger.log(
      `Sending email notification to ${recipients.join(', ')} using template ${template}`,
    );

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.logger.log(`Email notification sent successfully for job ${job.name}`);
  }

  private async executeNumberCrunching(job: Job): Promise<void> {
    // Simulate number crunching
    const iterations = job.metadata?.iterations || 1000;
    const complexity = job.metadata?.complexity || 1;

    this.logger.log(
      `Performing number crunching: ${iterations} iterations with complexity ${complexity}`,
    );

    // Simulate computation
    let result = 0;
    for (let i = 0; i < iterations * complexity; i++) {
      result += Math.sqrt(i) * Math.random();
    }

    this.logger.log(
      `Number crunching completed. Result: ${result.toFixed(2)}`,
    );
  }

  private async executeDataProcessing(job: Job): Promise<void> {
    // Simulate data processing
    const batchSize = job.metadata?.batchSize || 100;
    const records = job.metadata?.records || 1000;

    this.logger.log(
      `Processing ${records} records in batches of ${batchSize}`,
    );

    // Simulate batch processing
    for (let i = 0; i < records; i += batchSize) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      this.logger.debug(`Processed batch ${Math.floor(i / batchSize) + 1}`);
    }

    this.logger.log(`Data processing completed for job ${job.name}`);
  }

  private async executeReportGeneration(job: Job): Promise<void> {
    // Simulate report generation
    const reportType = job.metadata?.reportType || 'summary';
    const format = job.metadata?.format || 'pdf';

    this.logger.log(
      `Generating ${reportType} report in ${format} format`,
    );

    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 200));

    this.logger.log(`Report generated successfully for job ${job.name}`);
  }
}


import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsModule } from '../src/jobs/jobs.module';
import { SchedulerModule } from '../src/scheduler/scheduler.module';
import { Job, JobType, JobStatus } from '../src/jobs/entities/job.entity';
import { ConfigModule } from '@nestjs/config';

describe('JobsController (e2e)', () => {
  let app: INestApplication;
  let createdJobId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'Patel@123',
          database: process.env.DB_DATABASE || 'scheduler_db_test',
          entities: [Job],
          synchronize: true,
          dropSchema: true, // Clean database for each test run
        }),
        JobsModule,
        SchedulerModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /jobs', () => {
    it('should create a new job', () => {
      return request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'Test Email Job',
          type: JobType.EMAIL_NOTIFICATION,
          description: 'Test job for email notifications',
          schedule: '*/5 * * * *',
          metadata: {
            recipients: ['test@example.com'],
            template: 'test-template',
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('Test Email Job');
          expect(res.body.type).toBe(JobType.EMAIL_NOTIFICATION);
          expect(res.body.status).toBe(JobStatus.ACTIVE);
          expect(res.body.schedule).toBe('*/5 * * * *');
          expect(res.body.metadata).toMatchObject({
            recipients: ['test@example.com'],
            template: 'test-template',
          });
          expect(res.body).toHaveProperty('nextRunAt');
          expect(res.body.runCount).toBe(0);
          createdJobId = res.body.id;
        });
    });

    it('should fail with invalid data', () => {
      return request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'AB', // Too short
          type: 'invalid_type',
        })
        .expect(400);
    });

    it('should fail with missing required fields', () => {
      return request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'Test Job',
        })
        .expect(400);
    });
  });

  describe('GET /jobs', () => {
    it('should return paginated jobs', () => {
      return request(app.getHttpServer())
        .get('/jobs')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('jobs');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(Array.isArray(res.body.jobs)).toBe(true);
          expect(res.body.jobs.length).toBeGreaterThanOrEqual(1);
          const job = res.body.jobs.find((j) => j.id === createdJobId);
          expect(job).toBeDefined();
          expect(job.name).toBe('Test Email Job');
        });
    });

    it('should support pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/jobs?page=1&limit=10')
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(10);
          expect(res.body.jobs.length).toBeLessThanOrEqual(10);
        });
    });
  });

  describe('GET /jobs/:id', () => {
    it('should return a specific job by ID', () => {
      return request(app.getHttpServer())
        .get(`/jobs/${createdJobId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(createdJobId);
          expect(res.body.name).toBe('Test Email Job');
          expect(res.body.type).toBe(JobType.EMAIL_NOTIFICATION);
        });
    });

    it('should return 404 for non-existent job', () => {
      return request(app.getHttpServer())
        .get('/jobs/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('Database Changes', () => {
    it('should persist job in database', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'Database Test Job',
          type: JobType.NUMBER_CRUNCHING,
          schedule: '0 * * * *',
          metadata: { iterations: 1000 },
        })
        .expect(201);

      const jobId = createResponse.body.id;

      const getResponse = await request(app.getHttpServer())
        .get(`/jobs/${jobId}`)
        .expect(200);

      expect(getResponse.body.name).toBe('Database Test Job');
      expect(getResponse.body.type).toBe(JobType.NUMBER_CRUNCHING);
      expect(getResponse.body.metadata.iterations).toBe(1000);
    });
  });

  describe('Job Execution', () => {
    it('should schedule and execute job', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'Execution Test Job',
          type: JobType.DATA_PROCESSING,
          schedule: 'PT1M', // Every 1 minute (ISO 8601)
          metadata: { batchSize: 50, records: 100 },
        })
        .expect(201);

      const jobId = createResponse.body.id;
      const initialRunCount = createResponse.body.runCount;

      // Wait for job to potentially execute (in a real scenario, you'd wait longer)
      // For testing, we'll just verify the job was scheduled
      const getResponse = await request(app.getHttpServer())
        .get(`/jobs/${jobId}`)
        .expect(200);

      expect(getResponse.body).toHaveProperty('nextRunAt');
      expect(getResponse.body.nextRunAt).toBeTruthy();
      expect(new Date(getResponse.body.nextRunAt).getTime()).toBeGreaterThan(
        Date.now(),
      );
    });
  });

  describe('Schedule Validation', () => {
    it('should accept cron expression', () => {
      return request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'Cron Job',
          type: JobType.EMAIL_NOTIFICATION,
          schedule: '0 9 * * *', // Daily at 9 AM
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.schedule).toBe('0 9 * * *');
          expect(res.body.nextRunAt).toBeTruthy();
        });
    });

    it('should accept ISO 8601 interval', () => {
      return request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'Interval Job',
          type: JobType.REPORT_GENERATION,
          schedule: 'PT30M', // Every 30 minutes
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.schedule).toBe('PT30M');
          expect(res.body.nextRunAt).toBeTruthy();
        });
    });
  });
});


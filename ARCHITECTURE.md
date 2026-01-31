# Architecture Documentation

## Overview

This scheduler microservice is built with NestJS following SOLID principles and best practices for scalability and maintainability.

## Design Patterns

### 1. **Dependency Injection**
- All services use NestJS's dependency injection system
- Promotes loose coupling and testability

### 2. **Repository Pattern**
- TypeORM repositories abstract database operations
- Services interact with repositories, not directly with the database

### 3. **Service Layer Pattern**
- Business logic separated into service classes
- Controllers are thin and only handle HTTP concerns

### 4. **DTO Pattern**
- Data Transfer Objects for validation and API contracts
- Separates internal entities from external API contracts

## SOLID Principles

### Single Responsibility Principle (SRP)
- `JobsService`: Handles job CRUD operations
- `SchedulerService`: Manages job scheduling logic
- `JobExecutorService`: Executes individual jobs
- `JobsController`: Handles HTTP requests/responses

### Open/Closed Principle (OCP)
- Job types are extensible via enum
- New job types can be added without modifying existing code

### Liskov Substitution Principle (LSP)
- All job types implement the same execution interface
- Jobs can be substituted without breaking functionality

### Interface Segregation Principle (ISP)
- Services expose only necessary methods
- DTOs are specific to their use cases

### Dependency Inversion Principle (DIP)
- High-level modules depend on abstractions (services)
- Low-level modules (repositories) are injected

## Custom Scheduler Implementation

### Why Custom Scheduler?
- No external dependencies (as per requirements)
- Full control over scheduling logic
- Optimized for our specific use case

### How It Works

1. **Job Storage**: Jobs are stored in PostgreSQL with `nextRunAt` timestamp
2. **In-Memory Scheduling**: Active jobs are scheduled using Node.js `setTimeout`
3. **Periodic Check**: Every minute, the scheduler checks for jobs that should run
4. **Execution**: Jobs are executed asynchronously with concurrency limits
5. **Rescheduling**: After execution, next run time is calculated and job is rescheduled

### Schedule Parsing

#### Cron Expression Parser
- Supports: `*`, `*/n`, `n`, `n-m`, `n,m,o`
- Format: `minute hour day month weekday`
- Example: `*/5 * * * *` (every 5 minutes)

#### ISO 8601 Duration Parser
- Supports: `PT{n}H{n}M{n}S` format
- Example: `PT5M` (5 minutes), `PT1H` (1 hour)

## Performance Optimizations

### Database
1. **Indexes**: Composite indexes on `(status, nextRunAt)` for efficient queries
2. **Connection Pooling**: Max 20 connections for scalability
3. **Query Optimization**: Using query builders for indexed queries
4. **Batch Operations**: Batch updates where possible

### API
1. **Pagination**: GET /jobs supports pagination (max 100 items per page)
2. **Filtering**: Filter by status to reduce data transfer
3. **CORS**: Configured for cross-origin requests

### Scheduler
1. **Concurrency Control**: Max 10 concurrent job executions
2. **Efficient Lookups**: Using Map for O(1) job lookups
3. **Batch Processing**: Jobs executed in batches

## Scalability Considerations

### Database
- Connection pooling (20 connections)
- Indexed queries for fast lookups
- Efficient pagination

### Application
- Stateless design (can scale horizontally)
- In-memory scheduler (can be moved to Redis for multi-instance)
- Async job execution

### API
- Request validation at entry point
- Error handling and logging
- Rate limiting ready (can be added with middleware)

## Testing Strategy

### Unit Tests
- Service layer tests
- Scheduler logic tests
- DTO validation tests

### E2E Tests
- API endpoint tests
- Database integration tests
- Job execution tests
- Schedule validation tests

## Security Considerations

1. **Input Validation**: All inputs validated using class-validator
2. **SQL Injection**: Protected by TypeORM parameterized queries
3. **Error Handling**: Errors don't expose internal details
4. **CORS**: Configurable CORS policy

## Future Enhancements

1. **Redis Integration**: For distributed scheduling across instances
2. **Job Retry Logic**: Configurable retry strategies
3. **Job Priorities**: Priority-based job execution
4. **Webhooks**: Notify external systems on job completion
5. **Metrics**: Prometheus metrics for monitoring
6. **Rate Limiting**: API rate limiting middleware


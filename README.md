# Scheduler Microservice

A production-ready job scheduler microservice built with NestJS, TypeScript, and PostgreSQL.

## Features

- **Job Scheduling**: Custom scheduler implementation without external libraries
- **RESTful API**: Complete CRUD operations for job management
- **Database Integration**: PostgreSQL with TypeORM
- **API Documentation**: Swagger/OpenAPI documentation
- **E2E Testing**: Comprehensive test coverage
- **Scalability**: Optimized for high performance and scalability

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the root directory:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=Patel@123
DB_DATABASE=scheduler_db
PORT=3000
```

## Database Setup

```bash
# Create database
createdb scheduler_db

# Or using psql
psql -U postgres
CREATE DATABASE scheduler_db;
```

## Running the Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Documentation

Once the application is running, visit:
- Swagger UI: http://localhost:3000/api

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## API Endpoints

- `GET /jobs` - List all jobs
- `GET /jobs/:id` - Get job by ID
- `POST /jobs` - Create a new job

## Architecture

The application follows SOLID principles and is structured with:
- **Entities**: Database models
- **DTOs**: Data Transfer Objects for validation
- **Services**: Business logic
- **Controllers**: API endpoints
- **Scheduler**: Custom job scheduling engine


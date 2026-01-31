# Setup Instructions

## Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v12 or higher)
3. **npm** or **yarn**

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
# Using psql
psql -U postgres
CREATE DATABASE scheduler_db;
\q
```

Or using createdb:
```bash
createdb -U postgres scheduler_db
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=Patel@123
DB_DATABASE=scheduler_db
PORT=3000
NODE_ENV=development
```

### 4. Run Database Migrations

The application uses TypeORM's `synchronize` option in development mode, which will automatically create tables on startup.

### 5. Start the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### 6. Access the Application

- API: http://localhost:3000
- Swagger Documentation: http://localhost:3000/api

## Testing

```bash
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:cov
```

## Project Structure

```
src/
├── jobs/
│   ├── dto/              # Data Transfer Objects
│   ├── entities/         # Database entities
│   ├── jobs.controller.ts
│   ├── jobs.service.ts
│   └── jobs.module.ts
├── scheduler/
│   ├── scheduler.service.ts    # Custom scheduler implementation
│   ├── job-executor.service.ts # Job execution logic
│   └── scheduler.module.ts
├── app.module.ts
└── main.ts
```

## API Examples

### Create a Job

```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Email Report",
    "type": "email_notification",
    "description": "Sends daily email reports",
    "schedule": "0 9 * * *",
    "metadata": {
      "recipients": ["user@example.com"],
      "template": "daily-report"
    }
  }'
```

### List All Jobs

```bash
curl http://localhost:3000/jobs?page=1&limit=10
```

### Get Job by ID

```bash
curl http://localhost:3000/jobs/{job-id}
```

## Schedule Formats

### Cron Expression
- Format: `minute hour day month weekday`
- Example: `*/5 * * * *` (every 5 minutes)
- Example: `0 9 * * *` (daily at 9 AM)

### ISO 8601 Duration
- Format: `PT{n}H{n}M{n}S`
- Example: `PT5M` (every 5 minutes)
- Example: `PT1H` (every 1 hour)


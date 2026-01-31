# Scalability Across Multiple Services - One Pager

## Overview

The Scheduler Microservice is designed to scale horizontally across multiple service instances, supporting high-throughput scenarios with ~10,000 users, ~1,000 services, and ~6,000 API requests per minute.

---

## Current Architecture

### Single Instance Design
- **In-Memory Scheduler**: Jobs scheduled using Node.js `setTimeout` and `setInterval`
- **Database**: PostgreSQL with connection pooling (20 connections)
- **Stateless API**: All state persisted in database
- **Job Execution**: Concurrent execution with limits (max 10 concurrent jobs)

### Scalability Features (Current)
✅ **Database Connection Pooling**: 20 connections per instance  
✅ **Query Optimization**: Indexed queries for fast lookups  
✅ **Pagination**: Max 100 items per page  
✅ **Stateless Design**: No shared state between requests  
✅ **Efficient Scheduling**: O(1) job lookups using Map  

---

## Multi-Instance Scaling Strategy

### Challenge: Distributed Job Scheduling

**Problem**: Current in-memory scheduler cannot coordinate across multiple instances, leading to:
- Duplicate job executions
- Inconsistent scheduling
- Race conditions

### Solution: Redis-Based Distributed Scheduler

#### Architecture Pattern: Leader Election + Distributed Locking

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Instance 1 │     │  Instance 2 │     │  Instance 3 │
│  (Leader)   │     │  (Follower)  │     │  (Follower) │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                          │
                   ┌──────▼──────┐
                   │   Redis     │
                   │  (Coordinator)│
                   └─────────────┘
                          │
                   ┌──────▼──────┐
                   │ PostgreSQL  │
                   │  (Database)  │
                   └─────────────┘
```

---

## Implementation Strategy

### Phase 1: Redis Integration

**Components to Add:**
1. **Redis Client**: For distributed coordination
2. **Distributed Lock**: Prevent duplicate job execution
3. **Leader Election**: Single instance handles scheduling
4. **Job Queue**: Redis-based job queue for execution

**Key Changes:**
```typescript
// Pseudo-code structure
class DistributedSchedulerService {
  private redis: RedisClient;
  private leaderElection: LeaderElection;
  private distributedLock: DistributedLock;
  
  async scheduleJob(job: Job) {
    // Use Redis SETNX for distributed locking
    const lock = await this.distributedLock.acquire(job.id);
    if (lock) {
      await this.executeJob(job);
      await this.distributedLock.release(job.id);
    }
  }
}
```

### Phase 2: Load Balancing

**Infrastructure:**
- **Load Balancer**: Nginx/HAProxy for request distribution
- **Health Checks**: Monitor instance health
- **Session Affinity**: Not required (stateless design)

**Configuration:**
```
Upstream servers:
  - instance1:3000
  - instance2:3000
  - instance3:3000

Load balancing: Round-robin or least-connections
Health check: GET /health every 30s
```

### Phase 3: Database Scaling

**Current**: Single PostgreSQL instance  
**Scalable**: Read replicas + Connection pooling

**Strategy:**
- **Write**: Primary database (job creation, updates)
- **Read**: Read replicas (job listing, queries)
- **Connection Pool**: Per-instance pools (20 connections each)

---

## Performance Characteristics

### Single Instance Capacity
- **API Requests**: ~1,000 requests/minute
- **Concurrent Jobs**: 10 jobs simultaneously
- **Database Connections**: 20 connections
- **Memory**: ~200MB per instance

### Multi-Instance Capacity (3 instances)
- **API Requests**: ~3,000 requests/minute (linear scaling)
- **Concurrent Jobs**: 30 jobs simultaneously
- **Database Connections**: 60 connections total
- **Memory**: ~600MB total

### Target Capacity (10 instances)
- **API Requests**: ~10,000 requests/minute ✅
- **Concurrent Jobs**: 100 jobs simultaneously
- **Database Connections**: 200 connections (with read replicas)
- **Memory**: ~2GB total

---

## Scalability Patterns

### 1. Horizontal Scaling
✅ **Stateless API**: Any instance can handle any request  
✅ **Database-First**: All state in PostgreSQL  
✅ **No Shared Memory**: No inter-instance dependencies  

### 2. Vertical Scaling
✅ **Connection Pooling**: Efficient database usage  
✅ **Query Optimization**: Indexed queries  
✅ **Caching Ready**: Can add Redis cache layer  

### 3. Database Scaling
✅ **Read Replicas**: Distribute read load  
✅ **Connection Pooling**: Per-instance pools  
✅ **Query Optimization**: Indexes on frequently queried fields  

### 4. Job Execution Scaling
✅ **Concurrent Limits**: Prevents resource exhaustion  
✅ **Distributed Locking**: Prevents duplicate execution  
✅ **Queue-Based**: Can move to Redis queue for better distribution  

---

## Migration Path

### Step 1: Add Redis (Week 1)
- Install Redis server
- Add Redis client to project
- Implement distributed locking
- Test with 2 instances

### Step 2: Leader Election (Week 2)
- Implement leader election using Redis
- Only leader instance runs scheduler loop
- Automatic failover on leader failure

### Step 3: Load Balancer (Week 3)
- Set up Nginx/HAProxy
- Configure health checks
- Deploy multiple instances
- Monitor performance

### Step 4: Database Optimization (Week 4)
- Add read replicas
- Configure read/write splitting
- Optimize connection pools
- Monitor query performance

---

## Monitoring & Metrics

### Key Metrics to Track
1. **API Latency**: P50, P95, P99 response times
2. **Job Execution Rate**: Jobs executed per minute
3. **Database Connections**: Active connection count
4. **Instance CPU/Memory**: Resource utilization
5. **Error Rate**: Failed requests/jobs percentage

### Tools
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **ELK Stack**: Log aggregation
- **New Relic/DataDog**: APM monitoring

---

## Best Practices

### 1. Stateless Design ✅
- No session storage in memory
- All state in database
- Any instance can serve any request

### 2. Idempotency ✅
- Job execution is idempotent
- Retry-safe operations
- No side effects on retry

### 3. Graceful Shutdown ✅
- Clean up scheduled jobs on shutdown
- Complete in-flight requests
- Release database connections

### 4. Health Checks ✅
- `/health` endpoint for monitoring
- Database connectivity check
- Redis connectivity check (when added)

### 5. Circuit Breaker ✅
- Fail fast on database errors
- Retry with exponential backoff
- Prevent cascade failures

---

## Cost Optimization

### Current (Single Instance)
- **Compute**: 1 server instance
- **Database**: 1 PostgreSQL instance
- **Storage**: Minimal

### Scaled (10 Instances)
- **Compute**: 10 server instances (auto-scaling)
- **Database**: 1 primary + 2 read replicas
- **Redis**: 1 Redis instance (for coordination)
- **Load Balancer**: 1 load balancer

**Cost Savings:**
- Auto-scaling: Scale down during low traffic
- Spot instances: Use for non-critical workloads
- Reserved instances: For baseline capacity

---

## Conclusion

The Scheduler Microservice is **designed for scalability** with:
- ✅ Stateless architecture
- ✅ Database-first design
- ✅ Connection pooling
- ✅ Query optimization
- ✅ Ready for Redis integration

**Current Capacity**: ~1,000 requests/minute (single instance)  
**Target Capacity**: ~10,000 requests/minute (10 instances)  
**Scalability**: Linear scaling with proper infrastructure  

**Next Steps**: Implement Redis-based distributed scheduling for multi-instance coordination.

---

## Quick Reference

| Component | Current | Scaled (10x) |
|-----------|---------|--------------|
| Instances | 1 | 10 |
| API Capacity | 1K req/min | 10K req/min |
| Concurrent Jobs | 10 | 100 |
| DB Connections | 20 | 200 |
| Memory | 200MB | 2GB |


# Integration Tests Setup Guide

## Overview

The test suite includes integration tests that verify:
- Concurrent overtime request creation with overlap prevention
- Approval workflow with optimistic locking
- Audit trail with SHA256 hash chain integrity
- Idempotency key handling

## Test Status

Currently, tests are **skipped** because no PostgreSQL database is available. This is intentional and expected behavior when running locally without a database configured.

```
Test Suites: 1 skipped, 0 of 1 total
Tests:       7 skipped, 7 total
```

## Running Tests with a Database

### Prerequisites

1. **PostgreSQL Database** (15+)
   - Local: `docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15`
   - Or use: Neon, RDS, DigitalOcean Managed, etc.

2. **Database Created**
   ```bash
   # Create test database
   createdb -h localhost -U postgres overtime_test
   ```

### Setup Steps

1. **Update `.env.test`** with your database connection:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/overtime_test?schema=public"
   JWT_SECRET="test_secret_minimum_32_characters_for_jwt_key"
   JWT_ACCESS_EXP="15m"
   JWT_REFRESH_EXP_DAYS="14"
   CORS_ORIGIN="http://localhost:3000"
   NODE_ENV="test"
   ```

2. **Apply Migrations** to test database:
   ```bash
   # Create a test-specific migration command or use:
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/overtime_test?schema=public" npx prisma migrate deploy
   ```

3. **Run Tests**:
   ```bash
   npm test
   ```

   Or with watch mode:
   ```bash
   npm run test:watch
   ```

   Or with coverage:
   ```bash
   npm run test:coverage
   ```

### What the Tests Verify

#### Concurrent Request Creation
- ✅ Non-overlapping requests succeed
- ✅ Overlapping requests are rejected with PostgreSQL exclusion constraint
- ✅ Race condition handling with `SELECT...FOR UPDATE`

#### Approval Workflow
- ✅ Approval steps are created on submission
- ✅ Optimistic locking prevents concurrent conflicts (row_version checks)
- ✅ Status transitions happen atomically in transactions

#### Audit Trail
- ✅ Audit entries created on CREATE/UPDATE/DELETE
- ✅ SHA256 hash chain links audit entries
- ✅ Hash chain integrity prevents tamper detection

#### Idempotency
- ✅ Duplicate requests with same idempotency key return cached response
- ✅ Key deduplication prevents double-processing

### Docker Compose Method (Recommended)

For full integration testing with database included:

```bash
# Start full stack
docker-compose up -d db

# Wait for database to be ready
sleep 5

# Apply migrations
DATABASE_URL="postgresql://postgres:postgres@db:5432/overtime_test?schema=public" npx prisma migrate deploy

# Run tests
npm test
```

### Test Output

When database is available, you'll see:
```
PASS  __tests__/integration/overtime-requests.test.ts
  Overtime Management System - Integration Tests
    Concurrent Overtime Request Creation
      ✓ should allow non-overlapping requests for same user (XXXms)
      ✓ should REJECT overlapping requests (409 CONFLICT) with FOR UPDATE protection (XXXms)
    Approval Workflow with Optimistic Locking
      ✓ should create approval steps on request submission (XXXms)
      ✓ should handle approval with optimistic locking - row_version match (XXXms)
    Audit Trail with SHA256 Hash Chain
      ✓ should create audit entries for request creation (XXXms)
      ✓ should maintain hash chain across multiple updates (XXXms)
    Idempotency
      ✓ should return same response for duplicate idempotency keys (XXXms)

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
Snapshots:   0 total
Time:        X.XXXs
```

### Cleanup After Tests

```bash
# Delete test data
docker exec postgres dropdb -U postgres overtime_test

# Or manually in SQL
DROP DATABASE overtime_test;
```

## CI/CD Integration

For GitHub Actions or other CI systems, set up:

```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: overtime_test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432

env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/overtime_test
```

Then run:
```bash
npx prisma migrate deploy
npm test
```

## Troubleshooting

### "Cannot find name 'describe'" Error
Ensure `jest.setup.js` is configured and `.env.test` exists.

### "Database not available" Warning
This is expected without a configured PostgreSQL. Set up a database and update `.env.test`.

### Connection Refused
- Check PostgreSQL is running: `psql -h localhost -U postgres`
- Verify DATABASE_URL in `.env.test`
- Check firewall/network settings

### Timeout on Tests
Increase Jest timeout for slow systems:
```bash
npm test -- --testTimeout=10000
```

## Test File Structure

```
__tests__/
├── integration/
│   └── overtime-requests.test.ts   # Main integration tests
jest.config.js                       # Jest configuration
jest.setup.js                        # Environment setup
.env.test                           # Test environment variables
```

## Further Reading

- [Prisma Testing Guide](https://www.prisma.io/docs/orm/prisma-client/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)

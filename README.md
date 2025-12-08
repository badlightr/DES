# Overtime Management System (Lembur) - Production-Grade Backend

A full-featured overtime request management system built with Next.js, Prisma, and PostgreSQL. Production-ready with enterprise-grade security, transactional integrity, audit trails, and concurrent access control.

## Features

### Core Functionality
- **Overtime Request Management**: Submit, track, and manage overtime requests
- **Multi-Level Approval Workflow**: Configurable approval chains with role-based authorization
- **Attendance Integration**: Check against attendance logs (framework ready)
- **Business Rules Engine**: Daily/weekly limits, submission deadlines, overlap prevention
- **Audit Trail**: SHA256 hash chain for tamper-proof compliance logging

### Production Features
- **Authentication**: JWT with short-lived access tokens (15min) + refresh tokens (14d)
- **Token Revocation**: Refresh token tracking and revocation in PostgreSQL
- **RBAC**: 5-tier role hierarchy (EMPLOYEE, SUPERVISOR, MANAGER, HR, ADMIN)
- **Concurrency Control**: SELECT ... FOR UPDATE with optimistic locking (row_version)
- **Idempotency**: X-Idempotency-Key support for safe retries
- **Overlap Prevention**: PostgreSQL exclusion constraints on soft-deleted requests
- **Error Handling**: Comprehensive error hierarchy with proper HTTP status codes
- **CORS**: Secure cross-origin request handling with security headers

### Data Integrity
- **Transactions**: ACID-compliant with row-level locking
- **Soft Deletes**: is_active boolean with DB triggers for constraint consistency
- **Row Versioning**: Optimistic locking to prevent lost updates
- **Hash Chain**: Cryptographic proof of audit immutability
- **Triggers**: PostgreSQL-level consistency for audit and soft delete logic

### Operations
- **Background Worker**: Expiration, escalation, and token cleanup (FOR UPDATE SKIP LOCKED)
- **Docker Compose**: Full stack with Postgres + app + worker
- **Database Migrations**: Prisma with PostgreSQL-specific SQL migrations
- **Health Checks**: Docker health endpoints and database connectivity

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (local or Docker)
- npm 11+

### Local Development

```bash
# Install dependencies
npm install

# Setup database
docker-compose up -d db

# Wait for Postgres (~5s), then create tables and seed
npm run db:migrate
npm run db:seed

# Login with: admin@example.com / password123

# Start dev server
npm run dev
```

### Docker Compose (Full Stack)

```bash
# Start Postgres, Next.js, and background worker
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down
```

### Testing

```bash
npm test                    # Run tests once
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

## Production Deployment

### Setup

```bash
# 1. Create production database (Neon, RDS, etc.)
# 2. Set environment variables
export DATABASE_URL="postgresql://..."
export JWT_SECRET="long-random-secret"

# 3. Apply migrations
npm run db:deploy

# 4. Deploy Next.js app (Vercel, Render, etc.)
# 5. Deploy worker as scheduled job or sidecar service
```

## API Documentation

### Authentication
- `POST /api/v1/auth/login` - Login (email + password)
- `PATCH /api/v1/auth/refresh` - Refresh token + rotation
- `DELETE /api/v1/auth/logout` - Revoke tokens

### Overtime Requests
- `GET /api/v1/overtime-requests` - List with pagination
- `POST /api/v1/overtime-requests` - Create (requires `X-Idempotency-Key`)
- `GET /api/v1/overtime-requests/{id}/approvals` - View approval status
- `POST /api/v1/overtime-requests/{id}/approvals` - Approve/reject

## Concurrency Safety

✅ **Overlap Prevention**: PostgreSQL exclusion constraint + SELECT...FOR UPDATE
✅ **Optimistic Locking**: row_version field prevents lost updates on concurrent approvals
✅ **Idempotency**: X-Idempotency-Key prevents duplicate submissions
✅ **Soft Deletes**: DB trigger maintains constraint consistency
✅ **Hash Chain**: Cryptographic proof of audit immutability

Example: Two overlapping requests result in 409 CONFLICT on the second one.

## Documentation Files

- `ARCHITECTURE.md` - System design and technical decisions
- `API_REFERENCE.md` - Complete endpoint documentation with examples
- `SYSTEM_SUMMARY.txt` - Implementation checklist and deployment guideThis project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

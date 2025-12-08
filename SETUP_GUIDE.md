# Overtime System - Development Setup Guide

## 📋 Project Overview

Ini adalah sistem manajemen overtime dengan:
- **Backend**: Next.js 16+ dengan App Router
- **Database**: PostgreSQL
- **Auth**: JWT tokens
- **ORM**: Prisma v7
- **Features**: 
  - User & Department management
  - Overtime request tracking
  - Multi-level approval workflow
  - Attendance logging
  - Audit trail
  - Idempotency support

---

## 🚀 Quick Start

### 1. Prerequisites (Pastikan sudah terinstall)
- ✅ Node.js v20+ (npm included)
- ✅ Git
- ⏳ PostgreSQL 15+ (lihat [SETUP_DB.md](./SETUP_DB.md))

### 2. Setup Database
Ikuti panduan di [SETUP_DB.md](./SETUP_DB.md) untuk:
- Install PostgreSQL
- Create database `overtime_dev`
- Setup koneksi di `.env`

### 3. Initialize Database Schema

Setelah database siap, jalankan:

```powershell
# Generate initial migration (if tidak ada migrations folder)
npx prisma migrate dev --name init

# Atau jika sudah ada migration:
npx prisma migrate deploy

# Seed database dengan data awal
npx ts-node --transpile-only prisma/seed.ts
```

### 4. Start Development Server

```powershell
npm run dev
```

Server akan berjalan di http://localhost:3000

---

## 📁 Project Structure

```
overtime-system/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── overtime-requests/     # API endpoints
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── lib/
│       ├── prisma.ts                       # Prisma client singleton
│       ├── jwt.ts                          # JWT utilities
│       └── idempotency.ts                  # Idempotency helper
├── prisma/
│   ├── schema.prisma                       # Database schema
│   ├── seed.ts                             # Seeding script
│   └── migrations/                         # Database migrations
├── .env                                    # Environment variables (gitignored)
├── .env.example                            # Template
├── package.json
└── README.md
```

---

## 🔑 Environment Variables

Copy `.env.example` ke `.env` dan ubah sesuai kebutuhan:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/overtime_dev?schema=public"

# JWT
JWT_SECRET="your_secret_key"
JWT_ACCESS_EXP="15m"
JWT_REFRESH_EXP_DAYS="14"

# App
NODE_ENV=development
PORT=3000

# Idempotency
IDEMPOTENCY_TTL=86400
```

---

## 📊 Database Schema

### Core Models:
1. **User** - Employee/Admin users
2. **Department** - Organizational units
3. **OvertimeRequest** - Main overtime submission
4. **ApprovalStep** - Multi-level approval workflow
5. **AttendanceLog** - Check-in/check-out logs
6. **AuditEntry** - Audit trail untuk semua changes
7. **IdempotencyKey** - Prevent duplicate requests
8. **PolicyConfig** - System-wide settings

### Enums:
- **UserRole**: EMPLOYEE, SUPERVISOR, MANAGER, HR, ADMIN
- **RequestStatus**: DRAFT, SUBMITTED, PENDING, APPROVED, REJECTED, EXPIRED, CANCELED
- **ApprovalStatus**: PENDING, APPROVED, REJECTED, SKIPPED

---

## 🔧 Useful Commands

```powershell
# Start dev server
npm run dev

# Generate Prisma client
npx prisma generate

# Create/apply migrations
npx prisma migrate dev --name <migration_name>

# View database in Prisma Studio
npx prisma studio

# Seed database
npx ts-node --transpile-only prisma/seed.ts

# Run linter
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

---

## 📝 API Example: Create Overtime Request

### POST /api/v1/overtime-requests

**Headers:**
```
Authorization: Bearer <jwt_token>
x-idempotency-key: <unique_key>
Content-Type: application/json
```

**Body:**
```json
{
  "start_at": "2025-12-15T18:00:00Z",
  "end_at": "2025-12-15T21:00:00Z",
  "reason": "Project deadline",
  "departmentId": "dept-uuid"
}
```

**Response (201):**
```json
{
  "id": "req-uuid",
  "userId": "user-uuid",
  "status": "SUBMITTED",
  "duration_min": 180,
  "created_at": "2025-12-08T10:00:00Z"
}
```

---

## 🔐 JWT Token Generation

```typescript
import { signAccessToken } from "@/lib/jwt";

const token = signAccessToken({
  sub: "user-id",
  email: "user@example.com",
  role: "EMPLOYEE"
});
```

---

## 🐛 Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solusi**: PostgreSQL service tidak berjalan. Jalankan PostgreSQL service.

### Migration Error
```
Error: P1012 - Introspection error
```
**Solusi**: 
```powershell
npx prisma migrate resolve --rolled-back init
npx prisma migrate dev --name init
```

### Module Not Found
```
Cannot find module '@/lib/prisma'
```
**Solusi**: 
```powershell
npm install
npx prisma generate
```

---

## 📚 Next Steps

1. **Implement Authentication Routes**
   - Login endpoint
   - Refresh token logic
   - User registration

2. **Approval Workflow**
   - Build approval chain logic
   - Email notifications
   - Escalation handling

3. **Frontend**
   - Create React pages for submission
   - Approval dashboard
   - Admin panel

4. **Testing**
   - Unit tests (Jest)
   - Integration tests
   - API tests

5. **Deployment**
   - Setup CI/CD (GitHub Actions)
   - Deploy to production (Vercel, Railway, etc)
   - Setup PostgreSQL cloud (Neon, AWS RDS)

---

## 📖 Resources

- [Next.js Documentation](https://nextjs.org)
- [Prisma Documentation](https://www.prisma.io)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [JWT Tutorial](https://jwt.io/introduction)

---

## 📞 Support

Untuk issues atau questions:
1. Check [SETUP_DB.md](./SETUP_DB.md) untuk database setup
2. Check `npm run build` untuk compile errors
3. Check `npx prisma studio` untuk database inspection

---

**Last Updated**: December 8, 2025
**Version**: v1.0.0-setup

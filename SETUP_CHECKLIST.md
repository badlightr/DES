# 📋 Setup Checklist - Overtime System

## ✅ Completed Steps

- [x] Node.js v20.11.1 terinstall
- [x] npm v11.6.2 terinstall
- [x] Git v2.52.0 terinstall
- [x] Next.js 16.0.7 project scaffolded
- [x] Prisma v7.1.0 initialized
- [x] Database schema created dengan 8 models
- [x] JWT library setup
- [x] Idempotency helper created
- [x] Example API route created (`POST /api/v1/overtime-requests`)
- [x] .env dan .env.example configured
- [x] Git repository initialized dengan 3 commits
- [x] npm scripts added (db:migrate, db:seed, db:studio, etc)
- [x] Documentation created (SETUP_GUIDE.md, SETUP_DB.md)

---

## ⏳ TODO - Setup PostgreSQL Database

### Step 1: Install PostgreSQL Server
**Platform**: Windows  
**Download**: https://www.postgresql.org/download/windows/

Installation steps:
1. Download PostgreSQL 15 installer
2. Run installer
3. Choose default port: **5432**
4. Set password for `postgres` user (remember this!)
5. Choose to install pgAdmin (optional but recommended)

Estimated time: **10-15 minutes**

### Step 2: Create Database
After PostgreSQL installed, open **PostgreSQL command prompt** atau **pgAdmin** dan run:

```sql
CREATE DATABASE overtime_dev;
```

### Step 3: Update .env File
Edit file: `C:\DES_OVERTIME\overtime-system\.env`

Replace password dengan password yang Anda set:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD_HERE@localhost:5432/overtime_dev?schema=public"
```

### Step 4: Verify Connection
Test connection dari PowerShell:
```powershell
cd C:\DES_OVERTIME\overtime-system
npx prisma studio
```

Jika berhasil, GUI Prisma Studio akan membuka di browser.

---

## ⏳ TODO - Run Migrations & Seed

Setelah database terkoneksi:

```powershell
cd C:\DES_OVERTIME\overtime-system

# Create and apply migration
npm run db:migrate

# Seed initial data
npm run db:seed
```

---

## ⏳ TODO - Start Development Server

```powershell
cd C:\DES_OVERTIME\overtime-system
npm run dev
```

Server akan berjalan di: **http://localhost:3000**

---

## ⏳ TODO - Next Development Tasks

- [ ] Create login/signup endpoints
- [ ] Implement JWT refresh token logic
- [ ] Setup CORS middleware
- [ ] Create approval workflow API
- [ ] Build React pages for overtime submission
- [ ] Setup testing (Jest, Supertest)
- [ ] Add input validation (Zod, yup)
- [ ] Setup error handling middleware
- [ ] Create admin dashboard
- [ ] Setup email notifications

---

## 📁 Project Location

**Windows Path**: `C:\DES_OVERTIME\overtime-system`

**Key Files**:
- `.env` - Environment configuration
- `prisma/schema.prisma` - Database schema
- `src/app/api/v1/overtime-requests/route.ts` - Example API
- `src/lib/jwt.ts` - JWT utilities
- `src/lib/prisma.ts` - Database client
- `SETUP_GUIDE.md` - Full documentation
- `SETUP_DB.md` - Database setup guide

---

## 📚 Documentation Files

1. **SETUP_GUIDE.md** - Complete setup & development guide
2. **SETUP_DB.md** - PostgreSQL setup instructions
3. **SETUP_CHECKLIST.md** (this file) - Progress tracking

---

## 🎯 Current Status

**Overall Progress**: ~70% ✅

**Pending**: PostgreSQL database setup (30%)

---

## ⚡ Quick Commands Reference

```powershell
# Start development
npm run dev

# Database operations
npm run db:migrate          # Create migration
npm run db:deploy           # Apply existing migrations
npm run db:seed             # Seed initial data
npm run db:studio           # Open Prisma Studio GUI
npm run prisma:generate     # Generate Prisma client

# Code quality
npm run lint                # Run ESLint
npm run build               # Build for production
npm start                   # Start production server
```

---

## 🚨 Troubleshooting

### Error: "connect ECONNREFUSED"
- PostgreSQL service not running
- Solution: Start PostgreSQL from Windows Services

### Error: "password authentication failed"
- Wrong password in DATABASE_URL
- Solution: Update .env with correct password

### Error: "database does not exist"
- Database overtime_dev not created
- Solution: Run `CREATE DATABASE overtime_dev;` in PostgreSQL

### Error: "Cannot find module @/lib/prisma"
- Prisma client not generated
- Solution: Run `npm run prisma:generate`

---

## 📞 Need Help?

1. Check **SETUP_GUIDE.md** for detailed documentation
2. Check **SETUP_DB.md** for database setup issues
3. Run `npm run build` to check for compile errors
4. Run `npx prisma studio` to inspect database

---

**Setup Started**: December 8, 2025  
**Next Step**: Install PostgreSQL + Create Database  
**Estimated Total Time**: 1-2 hours

Good luck! 🚀

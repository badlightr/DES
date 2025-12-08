# Setup PostgreSQL untuk Overtime System

## Opsi 1: Install PostgreSQL Server Langsung (Recommended)

### Step 1: Download dan Install PostgreSQL
1. Download PostgreSQL untuk Windows: https://www.postgresql.org/download/windows/
2. Jalankan installer
3. Saat setup, ingat password untuk user `postgres` (contoh: `postgres`)
4. Default port adalah `5432`

### Step 2: Buat Database
Setelah PostgreSQL terinstall, buka PostgreSQL command prompt atau pgAdmin:

```sql
CREATE DATABASE overtime_dev;
```

### Step 3: Verifikasi Koneksi
Test koneksi dengan command ini di PowerShell:
```powershell
psql -U postgres -h localhost -d overtime_dev
```

Jika berhasil, Anda akan masuk ke prompt `overtime_dev=#`

### Step 4: Update .env
Pastikan `.env` file sudah benar:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/overtime_dev?schema=public"
```

Ganti `YOUR_PASSWORD` dengan password yang Anda set saat install PostgreSQL.

---

## Opsi 2: Gunakan PostgreSQL Container Tanpa Docker Desktop

Jika Anda ingin menggunakan container, gunakan **Podman** (alternatif Docker):
- Download: https://podman.io/

```powershell
podman run --name overtime_db `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=overtime_dev `
  -p 5432:5432 `
  postgres:15
```

---

## Setelah Database Siap

Jalankan migration:
```powershell
cd C:\DES_OVERTIME\overtime-system
npx prisma migrate deploy
```

Atau jalankan seed:
```powershell
npx ts-node --transpile-only prisma/seed.ts
```

---

## Troubleshooting

### Error: "connect ECONNREFUSED"
- PostgreSQL service tidak berjalan
- Solusi: Start PostgreSQL service dari Services (Windows) atau pgAdmin

### Error: "password authentication failed"
- Password di DATABASE_URL salah
- Solusi: Update .env dengan password yang benar

### Error: "database does not exist"
- Database overtime_dev belum dibuat
- Solusi: Buat dengan SQL command di atas

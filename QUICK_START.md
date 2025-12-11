# 🚀 Quick Start - Cara Menjalankan Aplikasi

## ⚡ Tercepat: Double-Click Batch File

### Windows (Recommended)
1. Buka File Explorer
2. Navigate ke: `C:\DES_OVERTIME\`
3. Double-click **`start-dev.bat`** untuk development server
   - Atau double-click **`build.bat`** untuk build

Terminal akan membuka otomatis dan menjalankan:
```
npm run dev
```

Server akan running di: **http://localhost:3000/login**

---

## 📝 Jika Ingin Manual

### PowerShell/CMD
```powershell
cd C:\DES_OVERTIME\overtime-system
npm run dev
```

### PowerShell Script
```powershell
C:\DES_OVERTIME\start-dev.ps1
```

---

## 🔐 Login Test

Setelah server running, buka: http://localhost:3000/login

**Test Accounts:**
- **Email**: admin@example.com | **Password**: password123 | **Role**: ADMIN
- **Email**: manager@example.com | **Password**: password123 | **Role**: MANAGER  
- **Email**: employee@example.com | **Password**: password123 | **Role**: EMPLOYEE

**Cara mudah:**
1. Klik salah satu test account di halaman login
2. Email akan auto-fill
3. Klik "Login"

---

## 📊 Fitur Yang Tersedia

### ✅ Employee
- Buat pengajuan lembur (tanggal, jam, alasan)
- Lihat status pengajuan (real-time)
- Statistik pengajuan

### ✅ Admin
- Lihat semua pengajuan karyawan
- Filter by status (Menunggu, Disetujui, Ditolak)
- Approve/Reject dengan alasan
- Auto-calculate gaji lembur (durasi × 30% × gaji/jam)

---

## 🛠️ Perintah Penting

| Command | Deskripsi |
|---------|-----------|
| `npm run dev` | Development server (hot reload) |
| `npm run build` | Build untuk production |
| `npm run start` | Jalankan production build |
| `npm test` | Run Jest tests |
| `npm test:watch` | Watch mode testing |
| `npm run lint` | Check code quality |

---

## 🐛 Troubleshooting

**Error: "Cannot find package.json"**
- Pastikan running dari folder `overtime-system`, bukan `DES_OVERTIME`

**Error: "Port 3000 already in use"**
```powershell
# Kill process di port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Login tidak bekerja**
- Buka F12 (DevTools) → Console untuk melihat error
- Pastikan server running di terminal

---

## 📚 Dokumentasi Lengkap

Buka file di dalam folder `overtime-system/`:
- `README.md` - Penjelasan project
- `API_REFERENCE.md` - Dokumentasi API
- `TESTING.md` - Setup testing
- `ARCHITECTURE.md` - Arsitektur sistem

---

## 🎯 Next Steps

1. ✅ Login dengan test account
2. ✅ Explore employee dashboard
3. ✅ Buat pengajuan lembur
4. ✅ Logout dan login sebagai admin
5. ✅ Approve/Reject pengajuan

---

**Happy Coding! 🎉**

Version: 1.0.0 | Status: Production Ready ✅

# Backend Beasiswa Platform

RESTful API untuk sistem manajemen beasiswa — menangani autentikasi, workflow pengajuan, verifikasi dokumen, dan pelaporan.

---

## Tech Stack

- **Node.js** + **Express.js v5**
- **Sequelize ORM** + **MySQL**
- **Redis** (ioredis) — caching
- **JWT** — access & refresh token
- **Multer** — file upload
- **Nodemailer** — email
- **Fonnte** — notifikasi WhatsApp
- **ExcelJS** — export laporan

---

## Struktur Proyek

```
backend-beasiswa/
├── config/
│   ├── config.js          # Konfigurasi database Sequelize
│   └── redis.js           # Koneksi Redis
├── controllers/           # Business logic per modul
├── middlewares/
│   ├── auth.middleware.js       # Verifikasi JWT
│   ├── role.middleware.js       # Otorisasi berbasis role
│   ├── cache.middleware.js      # Invalidasi cache Redis
│   ├── upload.middleware.js     # Konfigurasi Multer
│   └── response-time.middleware.js
├── migrations/            # Migrasi database Sequelize
├── models/                # Model Sequelize
├── routes/                # Definisi endpoint API
├── seeders/               # Data awal database
├── utils/
│   ├── response.js        # Helper respons standar
│   ├── jwt.js             # Helper JWT
│   ├── cacheHelper.js     # Utility Redis cache
│   ├── upload.js          # Utility file upload
│   ├── fonnte.js          # Integrasi WhatsApp (Fonnte)
│   ├── whatsappTemplate.js
│   ├── password.js
│   ├── parse_nim.js
│   └── slug.js
├── validators/
│   └── auth.validator.js  # Validasi input (express-validator)
├── uploads/               # Direktori penyimpanan file
├── index.js               # Entry point aplikasi
└── .env.example
```

---

## Roles

Sistem menggunakan RBAC dengan role berikut:

| Role | Deskripsi |
|---|---|
| `MAHASISWA` | Mengajukan dan memantau pendaftaran beasiswa |
| `VERIFIKATOR_FAKULTAS` | Memverifikasi berkas di tingkat fakultas |
| `VERIFIKATOR_DITMAWA` | Memverifikasi berkas di tingkat Ditmawa |
| `VALIDATOR_DITMAWA` | Memvalidasi data pendaftar |
| `PIMPINAN_FAKULTAS` | Melihat laporan dan statistik fakultas |
| `PIMPINAN_DITMAWA` | Melihat laporan, statistik, dan import penerima |
| `SUPERADMIN` | Akses penuh — manajemen beasiswa, pengguna, dan sistem |

---

## Quick Start

### Prasyarat

- Node.js v16+
- MySQL v8.0+
- Redis

### 1. Install dependensi

```bash
npm install
```

### 2. Konfigurasi environment

```bash
cp .env.example .env
# Isi variabel di .env sesuai environment kamu
```

### 3. Jalankan migrasi dan seeder

```bash
npm run migrate
npm run seed
```

### 4. Jalankan server

```bash
# Development
npm run dev

# Production
npm start
```

Server berjalan di `http://localhost:5000`

---

## Environment Variables

```env
# Database
DB_HOST=
DB_USER=
DB_PASS=
DB_NAME=
DB_DIALECT=

# Redis
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_RESET_PASSWORD_SECRET=

# WhatsApp (Fonnte)
FONNTE_TOKEN=

# Email
EMAIL_MAILER=
EMAIL_HOST=
EMAIL_PORT=
EMAIL_ENCRYPTION=
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=

# App
FRONTEND_URL=
BASE_URL=
```

---

## API Endpoints

Base URL: `/api`

### Auth — `/api/auth`

```
POST   /register                  Registrasi pengguna baru
POST   /login                     Login
POST   /logout                    Logout
POST   /token                     Refresh access token
POST   /verify-email              Verifikasi email
POST   /resend-verification-code  Kirim ulang kode verifikasi
POST   /forgot-password           Permintaan reset password
POST   /verify-reset-code         Verifikasi kode reset
POST   /reset-password            Reset password
GET    /profile                   Profil lengkap (auth)
GET    /basic-profile             Profil dasar (auth)
PUT    /profile                   Update profil (auth)
PUT    /password                  Ganti password (auth)
```

### Users — `/api/users`

```
GET    /                          Daftar semua pengguna
GET    /:id                       Detail pengguna
POST   /                          Buat pengguna baru
PUT    /:id                       Update pengguna
DELETE /:id                       Nonaktifkan pengguna
PUT    /:id/activate              Aktifkan pengguna
```

### Akademik

```
# Fakultas — /api/faculties
GET    /                          Daftar fakultas
POST   /                          Tambah fakultas
PUT    /:id                       Update fakultas
DELETE /:id / PATCH /:id/activate Toggle status

# Departemen — /api/departments
GET    /                          Daftar departemen
POST   /                          Tambah departemen
PUT    /:id                       Update departemen

# Program Studi — /api/study-programs
GET    /                          Daftar program studi
POST   /                          Tambah program studi
PUT    /:id                       Update program studi
```

### Beasiswa — `/api/beasiswa`

```
GET    /user                      Daftar beasiswa (publik)
GET    /user/:id                  Detail beasiswa (publik)
GET    /user/:id/others           Beasiswa lain (publik)
GET    /info/active               Beasiswa aktif untuk info (publik)
GET    /                          Daftar beasiswa (SUPERADMIN)
POST   /                          Buat beasiswa baru
PUT    /:id                       Update beasiswa
PATCH  /:id/activate              Aktifkan beasiswa
PATCH  /:id/deactivate            Nonaktifkan beasiswa
PATCH  /schema/:schemaId/activate       Aktifkan schema
PATCH  /schema/:schemaId/deactivate     Nonaktifkan schema
```

### Pendaftaran — `/api/pendaftaran`

```
GET    /scholarship/:scholarshipId/form              Form pendaftaran (MAHASISWA)
POST   /scholarship/:scholarshipId/submit            Submit pendaftaran (MAHASISWA)
PUT    /application/:applicationId/revision          Submit revisi (MAHASISWA)
```

### Applications — `/api/applications`

```
GET    /                          Daftar semua pengajuan (staf)
GET    /summary                   Ringkasan pengajuan (staf)
GET    /:id                       Detail pengajuan (staf)
GET    /user/:id                  Detail pengajuan milik mahasiswa
GET    /:id/comments              Komentar pengajuan
PUT    /awardees/assign           Assign penerima beasiswa (SUPERADMIN)
```

### Verifikator — `/api/verifikator`

```
PUT    /applications/:id/verify           Verifikasi pengajuan
PUT    /applications/:id/reject           Tolak pengajuan
PUT    /applications/:id/request-revision Minta revisi
```

### Validator — `/api/validator`

```
PUT    /applications/:id/validate         Validasi pengajuan
PUT    /applications/:id/reject           Tolak pengajuan
```

### Analytics & Laporan — `/api/analytics`

```
GET    /summary                   Ringkasan statistik
GET    /selection-summary         Statistik seleksi
GET    /status-summary            Distribusi status
GET    /faculty-distribution      Distribusi per fakultas
GET    /department-distribution   Distribusi per departemen
GET    /gender-distribution       Distribusi gender
GET    /yearly-trend              Tren tahunan
GET    /monthly-trend             Tren bulanan
GET    /scholarship-performance   Performa beasiswa
GET    /top-performing-faculties  Fakultas terbaik
GET    /applications-list         Daftar pengajuan
GET    /activities                Log aktivitas
GET    /export-laporan            Export laporan Excel
GET    /export-pendaftar          Export data pendaftar
GET    /import-penerima/template  Template import penerima
POST   /import-penerima/validate  Validasi file import
POST   /import-penerima           Import data penerima
```

### Lainnya

```
GET|POST|PUT  /api/government-scholarships   Data beasiswa pemerintah
GET|POST|PUT  /api/forms                     Manajemen form dinamis
GET           /api/history                   Riwayat pengajuan
GET|POST|PUT  /api/websites                  Konten website
GET|POST|PUT  /api/additional                Data tambahan
GET|POST|PUT  /api/notifications             Notifikasi
```

---

## Health Check

```
GET  /health        Status server dan koneksi database
GET  /redis-test    Status koneksi Redis
```

---

## Scripts

```bash
npm run dev              # Development dengan nodemon
npm start                # Production
npm run migrate          # Jalankan semua migrasi
npm run migrate:undo     # Undo migrasi terakhir
npm run migrate:undo:all # Undo semua migrasi
npm run seed             # Jalankan semua seeder
npm run seed:undo        # Undo seeder terakhir
npm run seed:undo:all    # Undo semua seeder
```

---

## Docker

```bash
docker build -t beasiswa-backend .
docker run -p 5000:5000 --env-file .env beasiswa-backend
```

---

## Related

- Frontend: [frontend-beasiswa-platform](https://github.com/paybackretr0/frontend-beasiswa-platform)

# Belajar Vibe Coding - Elysia, Drizzle, & MySQL

Project ini merupakan RESTful API backend yang dibangun dengan **Elysia.js**, **Drizzle ORM**, dan database **MySQL** yang dijalankan di atas runtime **Bun**. Aplikasi ini menyediakan fitur manajemen user sederhana (registrasi, login, profil saat ini, dan logout).

---

## Teknologi & Library yang Digunakan (Technology Stack)

### Core Stack
- **Runtime**: [Bun (v1.3.14+)](https://bun.sh/) - JavaScript/TypeScript runtime yang sangat cepat dengan build-in test runner, package manager, dan compiler.
- **Web Framework**: [Elysia.js (v1.4.29+)](https://elysiajs.com/) - Framework web TypeScript berkinerja sangat tinggi yang kompatibel penuh dengan Bun.
- **Database**: [MySQL](https://www.mysql.com/) - RDBMS yang andal untuk penyimpanan data pengguna dan sesi.
- **ORM**: [Drizzle ORM (v0.45.2+)](https://orm.drizzle.team/) - ORM TypeScript ringan dan cepat dengan dukungan penuh untuk MySQL.
- **Migration & Schema Tooling**: [Drizzle Kit (v0.31.10+)](https://orm.drizzle.team/docs/kit-overview) - CLI tool untuk migrasi dan pengelolaan skema database.

### Library Tambahan
- **Bcrypt**: Bawaan dari runtime Bun (`Bun.password`) untuk enkripsi/hashing password secara cepat dan aman.
- **mysql2**: Driver database MySQL non-blocking yang digunakan oleh Drizzle ORM.

---

## Arsitektur & Struktur Folder

Aplikasi ini menggunakan pola arsitektur **Service-Route** untuk memisahkan logika bisnis dari definisi endpoint (routing).

### Struktur File Proyek:
```text
├── drizzle/                    # File hasil generate migrasi Drizzle Kit
├── src/
│   ├── db/
│   │   ├── index.ts            # Inisialisasi koneksi Drizzle ORM (Connection Pool)
│   │   └── schema.ts           # Definisi skema tabel database (Users & Sessions)
│   ├── routes/
│   │   └── users-route.ts      # Routing Elysia untuk fitur pengguna (User)
│   ├── services/
│   │   └── users-service.ts    # Logika bisnis & manipulasi database pengguna (User)
│   └── index.ts                # Entry point aplikasi (Inisialisasi Elysia App)
├── tests/
│   └── users.test.ts           # Suite pengujian unit test (Bun Test)
├── .env                        # File konfigurasi environment local
├── .env.example                # Template konfigurasi environment
├── bun.lock                    # Lockfile Bun dependencies
├── drizzle.config.ts           # Konfigurasi Drizzle Kit untuk MySQL
├── package.json                # Manifest proyek & script runner
└── tsconfig.json               # Konfigurasi TypeScript compiler
```

### Aturan Penamaan File (File Naming Conventions):
- **Routes**: Disimpan di dalam folder `src/routes/` menggunakan format penamaan `[fitur]-route.ts`. Contoh: `users-route.ts`.
- **Services (Logika Bisnis)**: Disimpan di dalam folder `src/services/` menggunakan format penamaan `[fitur]-service.ts`. Contoh: `users-service.ts`.
- **Tests**: Disimpan di dalam folder `tests/` dengan penamaan `[fitur].test.ts`. Contoh: `users.test.ts`.

---

## Skema Database

Berikut merupakan rancangan tabel database yang digunakan di dalam `src/db/schema.ts`:

### 1. Tabel `users`
Tabel untuk menampung data profil pengguna yang terdaftar.
| Nama Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `serial` | Primary Key, Auto Increment |
| `name` | `varchar(255)` | Not Null, nama lengkap pengguna |
| `email` | `varchar(255)` | Not Null, Unique, email pengguna |
| `password` | `varchar(255)` | Not Null, password yang telah di-hash menggunakan bcrypt |
| `created_at` | `timestamp` | Not Null, default sekarang |

### 2. Tabel `sessions`
Tabel untuk menyimpan session token aktif pengguna yang sedang login.
| Nama Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `serial` | Primary Key, Auto Increment |
| `token` | `varchar(255)` | Not Null, Unique UUID token |
| `user_id` | `bigint unsigned` | Foreign Key (merujuk ke `users.id`), Not Null |
| `created_at` | `timestamp` | Not Null, default sekarang |

---

## API Endpoints yang Tersedia

Seluruh route didefinisikan dengan prefix `/api`.

### 1. Registrasi User
Mendaftarkan akun pengguna baru ke database.
- **Endpoint**: `POST /api/users`
- **Request Body**:
  ```json
  {
    "name": "Nama Pengguna",
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response Sukses (201 Created)**:
  ```json
  {
    "data": "OK"
  }
  ```
- **Response Gagal (400 Bad Request / 422 Unprocessable Content)**:
  ```json
  {
    "error": "Email sudah terdaftar"
  }
  ```

### 2. Login User
Melakukan otentikasi pengguna dan mengembalikan token session aktif.
- **Endpoint**: `POST /api/users/login`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response Sukses (200 OK)**:
  ```json
  {
    "data": {
      "token": "a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6"
    }
  }
  ```
- **Response Gagal (400 Bad Request / 422 Unprocessable Content)**:
  ```json
  {
    "error": "Email atau password salah "
  }
  ```

### 3. Get Current User
Mengambil informasi profil user yang sedang login saat ini.
- **Endpoint**: `GET /api/users/login/current`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Response Sukses (200 OK)**:
  ```json
  {
    "data": {
      "id": 1,
      "name": "Nama Pengguna",
      "email": "user@example.com",
      "created_at": "2026-06-18T04:30:00.000Z"
    }
  }
  ```
- **Response Gagal (401 Unauthorized)**:
  ```json
  {
    "error": "Unauthorized"
  }
  ```

### 4. Logout User
Menghapus session token aktif pengguna dari database.
- **Endpoint**: `DELETE /api/users/logout`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Response Sukses (200 OK)**:
  ```json
  {
    "data": "OK"
  }
  ```
- **Response Gagal (401 Unauthorized)**:
  ```json
  {
    "error": "Unauthorized"
  }
  ```

---

## Panduan Setup Project (Installation Setup)

1. **Clone Repository**:
   ```bash
   git clone https://github.com/tumbalku/belajar-vibe-coding-pzn.git
   cd belajar-vibe-coding-pzn
   ```

2. **Install Dependencies**:
   Gunakan Bun untuk instalasi dependensi proyek:
   ```bash
   bun install
   ```

3. **Konfigurasi Environment Variable**:
   Salin file `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
   Buka file `.env` dan sesuaikan koneksi database MySQL Anda:
   ```env
   DATABASE_URL="mysql://username:password@localhost:3306/nama_database"
   ```

4. **Sinkronisasi Skema Database**:
   Dorong skema tabel Drizzle ke database MySQL Anda:
   ```bash
   bun run db:push
   ```

---

## Cara Menjalankan Aplikasi

Jalankan server pengembangan lokal dengan perintah berikut:
```bash
bun run dev
```
Server akan berjalan di http://localhost:3000 (atau port yang didefinisikan di `.env`).

---

## Cara Menjalankan Pengujian (Testing)

Proyek ini telah dilengkapi dengan unit test komprehensif menggunakan test runner bawaan Bun.

### Persyaratan Uji Coba:
- Pengujian menggunakan database yang sama yang dikonfigurasi pada `.env` (atau pastikan database pengujian siap digunakan).
- **Catatan Penting**: Sebelum setiap skenario pengujian (`beforeEach`), sistem otomatis akan menghapus seluruh data pada tabel `sessions` dan `users` untuk memastikan independensi data pengujian.

### Jalankan Semua Test:
Eksekusi perintah berikut pada terminal Anda:
```bash
bun test
```

### Menjalankan Test dalam Watch Mode:
Untuk memantau pengujian secara berkala saat kode berubah:
```bash
bun test --watch
```

Output pengujian yang berhasil akan terlihat seperti berikut:
```text
bun test v1.3.14 (0d9b296a)

tests\users.test.ts:
(pass) User API Tests > POST /api/users - Registrasi User > Skenario Sukses: Registrasi berhasil dengan data valid
(pass) User API Tests > POST /api/users - Registrasi User > Skenario Gagal: Email sudah terdaftar
...
(pass) User API Tests > DELETE /api/users/logout - Logout User > Skenario Sukses: Berhasil logout dan menghapus token session di DB
(pass) User API Tests > DELETE /api/users/logout - Logout User > Skenario Gagal: Tanpa header Authorization
(pass) User API Tests > DELETE /api/users/logout - Logout User > Skenario Gagal: Token tidak terdaftar di DB

 16 pass
 0 fail
 38 expect() calls
Ran 16 tests across 1 file. [1.70s]
```

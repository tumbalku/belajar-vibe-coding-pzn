import { db } from "../db";
import { users, sessions } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * Mendaftarkan akun pengguna baru ke dalam database.
 * 
 * Skenario & Langkah Kerja:
 * 1. Menerima payload berisi nama, email, dan password.
 * 2. Melakukan verifikasi ke database untuk memastikan email belum terdaftar.
 * 3. Mengenkripsi password menggunakan native Bun bcrypt hashing.
 * 4. Menyimpan data pengguna baru ke database MySQL.
 * 
 * @param payload Objek data registrasi pengguna (name, email, password)
 * @returns Objek response sukses `{ data: "OK" }`
 */
export const registerUser = async (payload: any) => {
  const { name, email, password } = payload;

  // 1. Cek apakah email sudah terdaftar
  const existingUser = await db.select().from(users).where(eq(users.email, email));
  if (existingUser.length > 0) {
    throw new Error("Email sudah terdaftar");
  }

  // 2. Hash password menggunakan native Bun bcrypt
  const hashedPassword = await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10,
  });

  // 3. Simpan ke database
  await db.insert(users).values({
    name,
    email,
    password: hashedPassword,
  });

  return { data: "OK" };
};

/**
 * Melakukan autentikasi pengguna dan mengembalikan token sesi aktif baru jika sukses.
 * 
 * Skenario & Langkah Kerja:
 * 1. Menerima payload email dan password dari body request.
 * 2. Mencari data pengguna berdasarkan email.
 * 3. Memverifikasi password yang dikirim dengan password terenkripsi di database.
 * 4. Membuat token UUID sesi baru.
 * 5. Menyimpan session token ke database.
 * 
 * @param payload Objek kredensial login (email, password)
 * @returns Objek token sesi `{ data: { token: string } }`
 */
export const loginUser = async (payload: any) => {
  const { email, password } = payload;

  // 1. Cari User di database
  const existingUser = await db.select().from(users).where(eq(users.email, email));
  const user = existingUser[0];
  if (!user) {
    throw new Error("Email atau password salah ");
  }

  // 2. Validasi Password dengan bcrypt
  const isPasswordValid = await Bun.password.verify(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Email atau password salah ");
  }

  // 3. Generate Session Token unik menggunakan UUID
  const token = crypto.randomUUID();

  // 4. Simpan Session baru ke tabel sessions
  await db.insert(sessions).values({
    token,
    userId: user.id,
  });

  return {
    data: {
      token,
    },
  };
};

/**
 * Mengambil profil data user saat ini berdasarkan session token yang valid.
 * 
 * Skenario & Langkah Kerja:
 * 1. Menerima token sesi dari header authorization.
 * 2. Mencari record sesi aktif di database.
 * 3. Mencari data profil user berdasarkan userId dari record sesi tersebut.
 * 4. Mengembalikan data profil (ID, nama, email, waktu pembuatan) tanpa password.
 * 
 * @param token UUID token sesi aktif
 * @returns Objek profil data user saat ini
 */
export const getCurrentUser = async (token: string) => {
  // 1. Cari record token sesi di tabel sessions
  const sessionRecord = await db.select().from(sessions).where(eq(sessions.token, token));
  const session = sessionRecord[0];
  if (!session) {
    throw new Error("Unauthorized");
  }

  // 2. Ambil data profil user berdasarkan userId dari sesi
  const userRecord = await db.select().from(users).where(eq(users.id, session.userId));
  const user = userRecord[0];
  if (!user) {
    throw new Error("Unauthorized");
  }

  // 3. Mengembalikan profil (password disembunyikan untuk keamanan)
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.createdAt,
  };
};

/**
 * Mengakhiri sesi pengguna saat ini dengan menghapus token dari database sessions.
 * 
 * Skenario & Langkah Kerja:
 * 1. Menerima token sesi dari header authorization.
 * 2. Memastikan token sesi ada di database.
 * 3. Menghapus data token sesi dari database sessions secara permanen.
 * 
 * @param token UUID token sesi aktif
 * @returns Objek response sukses `{ data: "OK" }`
 */
export const logoutUser = async (token: string) => {
  // 1. Cek ketersediaan session token di database
  const sessionRecord = await db.select().from(sessions).where(eq(sessions.token, token));
  if (sessionRecord.length === 0) {
    throw new Error("Unauthorized");
  }

  // 2. Hapus token sesi secara permanen
  await db.delete(sessions).where(eq(sessions.token, token));

  return { data: "OK" };
};

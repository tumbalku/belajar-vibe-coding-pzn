import { db } from "../db";
import { users, sessions } from "../db/schema";
import { eq } from "drizzle-orm";

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

export const loginUser = async (payload: any) => {
  const { email, password } = payload;

  // 1. Cari User
  const existingUser = await db.select().from(users).where(eq(users.email, email));
  const user = existingUser[0];
  if (!user) {
    throw new Error("Email atau password salah ");
  }

  // 2. Validasi Password
  const isPasswordValid = await Bun.password.verify(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Email atau password salah ");
  }

  // 3. Generate Token
  const token = crypto.randomUUID();

  // 4. Simpan Session
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

export const getCurrentUser = async (token: string) => {
  const sessionRecord = await db.select().from(sessions).where(eq(sessions.token, token));
  const session = sessionRecord[0];
  if (!session) {
    throw new Error("Unauthorized");
  }

  const userRecord = await db.select().from(users).where(eq(users.id, session.userId));
  const user = userRecord[0];
  if (!user) {
    throw new Error("Unauthorized");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.createdAt,
  };
};

export const logoutUser = async (token: string) => {
  const sessionRecord = await db.select().from(sessions).where(eq(sessions.token, token));
  if (sessionRecord.length === 0) {
    throw new Error("Unauthorized");
  }

  await db.delete(sessions).where(eq(sessions.token, token));

  return { data: "OK" };
};

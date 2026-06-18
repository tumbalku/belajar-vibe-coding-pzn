import { describe, test, expect, beforeEach } from "bun:test";
import { app } from "../src/index";
import { db } from "../src/db";
import { users, sessions } from "../src/db/schema";
import { eq } from "drizzle-orm";

describe("User API Tests", () => {
  // Setiap skenario test, hapus datanya terlebih dahulu agar konsisten
  beforeEach(async () => {
    await db.delete(sessions);
    await db.delete(users);
  });

  describe("POST /api/users - Registrasi User", () => {
    test("Skenario Sukses: Registrasi berhasil dengan data valid", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "test@example.com",
            password: "password123",
          }),
        })
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toEqual({ data: "OK" });

      // Memastikan data tersimpan di DB dan password di-hash
      const dbUsers = await db.select().from(users).where(eq(users.email, "test@example.com"));
      expect(dbUsers.length).toBe(1);
      expect(dbUsers[0].name).toBe("Test User");
      expect(await Bun.password.verify("password123", dbUsers[0].password)).toBe(true);
    });

    test("Skenario Gagal: Email sudah terdaftar", async () => {
      // Registrasi pertama
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User 1",
            email: "duplicate@example.com",
            password: "password123",
          }),
        })
      );

      // Registrasi kedua dengan email yang sama
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User 2",
            email: "duplicate@example.com",
            password: "password456",
          }),
        })
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toEqual({ error: "Email sudah terdaftar" });
    });

    test("Skenario Gagal: Validasi nama tidak valid (melebihi 255 karakter)", async () => {
      const longName = "a".repeat(256);
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: longName,
            email: "test@example.com",
            password: "password123",
          }),
        })
      );

      expect(res.status).toBe(422);
    });

    test("Skenario Gagal: Validasi format email tidak valid", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "invalid-email-format",
            password: "password123",
          }),
        })
      );

      expect(res.status).toBe(422);
    });

    test("Skenario Gagal: Validasi password tidak valid (melebihi 255 karakter)", async () => {
      const longPassword = "a".repeat(256);
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "test@example.com",
            password: longPassword,
          }),
        })
      );

      expect(res.status).toBe(422);
    });
  });

  describe("POST /api/users/login - Login User", () => {
    beforeEach(async () => {
      // Registrasi user default untuk login
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Login User",
            email: "login@example.com",
            password: "password123",
          }),
        })
      );
    });

    test("Skenario Sukses: Login berhasil dengan kredensial benar", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "login@example.com",
            password: "password123",
          }),
        })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.token).toBeDefined();

      // Memastikan session tersimpan di DB
      const dbSessions = await db.select().from(sessions).where(eq(sessions.token, json.data.token));
      expect(dbSessions.length).toBe(1);
    });

    test("Skenario Gagal: Email belum terdaftar", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "notfound@example.com",
            password: "password123",
          }),
        })
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toEqual({ error: "Email atau password salah " });
    });

    test("Skenario Gagal: Password salah", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "login@example.com",
            password: "wrongpassword",
          }),
        })
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toEqual({ error: "Email atau password salah " });
    });

    test("Skenario Gagal: Validasi format email tidak valid", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "invalid-email-format",
            password: "password123",
          }),
        })
      );

      expect(res.status).toBe(422);
    });
  });

  describe("GET /api/users/login/current - Get Current User", () => {
    let activeToken: string;

    beforeEach(async () => {
      // Registrasi dan login user untuk mendapatkan token aktif
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Current User",
            email: "current@example.com",
            password: "password123",
          }),
        })
      );

      const loginRes = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "current@example.com",
            password: "password123",
          }),
        })
      );

      const loginJson = await loginRes.json();
      activeToken = loginJson.data.token;
    });

    test("Skenario Sukses: Berhasil mendapat data dengan token valid", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/login/current", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${activeToken}`,
          },
        })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.email).toBe("current@example.com");
      expect(json.data.name).toBe("Current User");
      expect(json.data.id).toBeDefined();
      expect(json.data.created_at).toBeDefined();
      expect(json.data.password).toBeUndefined(); // Memastikan password tidak dikembalikan
    });

    test("Skenario Gagal: Tanpa header Authorization", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/login/current", {
          method: "GET",
        })
      );

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json).toEqual({ error: "Unauthorized" });
    });

    test("Skenario Gagal: Format Authorization header salah", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/login/current", {
          method: "GET",
          headers: {
            "Authorization": `Token ${activeToken}`,
          },
        })
      );

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json).toEqual({ error: "Unauthorized" });
    });

    test("Skenario Gagal: Token tidak terdaftar di DB / Expired", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/login/current", {
          method: "GET",
          headers: {
            "Authorization": `Bearer non-existent-token`,
          },
        })
      );

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json).toEqual({ error: "Unauthorized" });
    });
  });

  describe("DELETE /api/users/logout - Logout User", () => {
    let activeToken: string;

    beforeEach(async () => {
      // Registrasi dan login user untuk mendapatkan token aktif
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Logout User",
            email: "logout@example.com",
            password: "password123",
          }),
        })
      );

      const loginRes = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "logout@example.com",
            password: "password123",
          }),
        })
      );

      const loginJson = await loginRes.json();
      activeToken = loginJson.data.token;
    });

    test("Skenario Sukses: Berhasil logout dan menghapus token session di DB", async () => {
      // Pastikan session ada di DB sebelum logout
      const beforeLogout = await db.select().from(sessions).where(eq(sessions.token, activeToken));
      expect(beforeLogout.length).toBe(1);

      const res = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${activeToken}`,
          },
        })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: "OK" });

      // Pastikan session sudah terhapus di DB
      const afterLogout = await db.select().from(sessions).where(eq(sessions.token, activeToken));
      expect(afterLogout.length).toBe(0);
    });

    test("Skenario Gagal: Tanpa header Authorization", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
        })
      );

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json).toEqual({ error: "Unauthorized" });
    });

    test("Skenario Gagal: Token tidak terdaftar di DB / Sudah logout sebelumnya", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer non-existent-token`,
          },
        })
      );

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json).toEqual({ error: "Unauthorized" });
    });
  });
});

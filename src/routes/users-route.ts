import { Elysia, t } from "elysia";
import { registerUser, loginUser, getCurrentUser, logoutUser } from "../services/users-service";

export const usersRoute = new Elysia({ prefix: "/api" }).post(
  "/users",
  async ({ body, set }) => {
    try {
      const result = await registerUser(body);
      set.status = 201;
      return result;
    } catch (error: any) {
      if (error.message === "Email sudah terdaftar") {
        set.status = 400;
        return { error: error.message };
      }
      set.status = 500;
      return { error: "Internal Server Error" };
    }
  },
  {
    body: t.Object({
      name: t.String({ maxLength: 255 }),
      email: t.String({ format: "email", maxLength: 255 }),
      password: t.String({ maxLength: 255 }),
    }),
    detail: {
      summary: "Registrasi User Baru",
      description: "Membuat user baru di dalam database.",
      tags: ["Authentication"],
      responses: {
        201: {
          description: "User berhasil dibuat",
          content: {
            "application/json": {
              schema: t.Object({
                data: t.Object({
                  id: t.Number(),
                  name: t.String(),
                  email: t.String(),
                }),
              }),
            },
          },
        },
        400: {
          description: "Validasi gagal atau Email sudah terdaftar",
        },
      },
    },
  }
).post(
  "/users/login",
  async ({ body, set }) => {
    try {
      const result = await loginUser(body);
      set.status = 200;
      return result;
    } catch (error: any) {
      if (error.message === "Email atau password salah ") {
        set.status = 400;
        return { error: error.message };
      }
      set.status = 500;
      return { error: "Internal Server Error" };
    }
  },
  {
    body: t.Object({
      email: t.String({ format: "email" }),
      password: t.String(),
    }),
    detail: {
      summary: "Login User",
      description: "Melakukan autentikasi menggunakan email dan password untuk mendapatkan token JWT.",
      tags: ["Authentication"],
      responses: {
        200: {
          description: "Login berhasil, token dikembalikan",
          content: {
            "application/json": {
              schema: t.Object({
                data: t.Object({
                  token: t.String(),
                }),
              }),
            },
          },
        },
        400: {
          description: "Email atau password salah",
        },
      },
    },
  }
).get("/users/login/current", async ({ headers, set }) => {
  try {
    const authHeader = headers['authorization'];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized");
    }
    
    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new Error("Unauthorized");
    }
    const result = await getCurrentUser(token);
    
    set.status = 200;
    return { data: result };
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      set.status = 401;
      return { error: error.message };
    }
    set.status = 500;
    return { error: "Internal Server Error" };
  }
}, {
  headers: t.Object({
    authorization: t.String({
      description: "Format: Bearer <token_jwt>",
    }),
  }),
  detail: {
    summary: "Ambil Profil User Aktif",
    description: "Mengambil data user yang sedang masuk berdasarkan token JWT di header Authorization.",
    tags: ["User"],
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Data user berhasil diambil",
      },
      401: {
        description: "Token tidak valid atau tidak disediakan (Unauthorized)",
      },
    },
  },
}).delete("/users/logout", async ({ headers, set }) => {
  try {
    const authHeader = headers['authorization'];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized");
    }
    
    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new Error("Unauthorized");
    }
    const result = await logoutUser(token);
    
    set.status = 200;
    return result;
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      set.status = 401;
      return { error: error.message };
    }
    set.status = 500;
    return { error: "Internal Server Error" };
  }
}, {
  headers: t.Object({
    authorization: t.String({
      description: "Format: Bearer <token_jwt>",
    }),
  }),
  detail: {
    summary: "Logout User",
    description: "Menghapus session token user aktif agar tidak bisa digunakan kembali.",
    tags: ["Authentication"],
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Berhasil logout",
      },
      401: {
        description: "Token tidak valid atau tidak disediakan (Unauthorized)",
      },
    },
  },
});

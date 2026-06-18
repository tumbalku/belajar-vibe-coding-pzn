import { Elysia, t } from "elysia";
import { registerUser, loginUser, getCurrentUser } from "../services/users-service";

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
      name: t.String(),
      email: t.String({ format: "email" }),
      password: t.String(),
    }),
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
  }
).get("/users/login/current", async ({ headers, set }) => {
  try {
    const authHeader = headers['authorization'];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized");
    }
    
    const token = authHeader.split(" ")[1];
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
});

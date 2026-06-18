import { Elysia, t } from "elysia";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

const app = new Elysia()
  .get("/", () => ({
    message: "Welcome to Elysia + Drizzle + MySQL API!",
    docs: "/users for list of users",
  }))
  .get("/users", async () => {
    try {
      const allUsers = await db.select().from(users);
      return allUsers;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  })
  .post(
    "/users",
    async ({ body }) => {
      try {
        await db.insert(users).values({
          name: body.name,
          email: body.email,
        });
        return { success: true, message: "User created successfully" };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
    {
      body: t.Object({
        name: t.String(),
        email: t.String({ format: "email" }),
      }),
    }
  )
  .get("/users/:id", async ({ params: { id } }) => {
    try {
      const userId = parseInt(id, 10);
      if (isNaN(userId)) {
        return { success: false, error: "Invalid user ID" };
      }
      const user = await db.select().from(users).where(eq(users.id, userId));
      if (user.length === 0) {
        return { success: false, error: "User not found" };
      }
      return user[0];
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  })
  .delete("/users/:id", async ({ params: { id } }) => {
    try {
      const userId = parseInt(id, 10);
      if (isNaN(userId)) {
        return { success: false, error: "Invalid user ID" };
      }
      await db.delete(users).where(eq(users.id, userId));
      return { success: true, message: "User deleted successfully" };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  })
  .listen(process.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

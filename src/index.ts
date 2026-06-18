import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { usersRoute } from "./routes/users-route";

const app = new Elysia()
  .use(
    swagger({
      path: "/swagger", // Route untuk mengakses halaman Swagger
      documentation: {
        info: {
          title: "Belajar Vibe Coding API Documentation",
          version: "1.0.0",
          description: "Dokumentasi API untuk autentikasi dan manajemen user.",
        },
        components: {
          securitySchemes: {
            BearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
              description: "Masukkan JWT token Anda untuk autentikasi",
            },
          },
        },
      },
    })
  )
  .get("/", () => ({
    message: "Welcome to Elysia + Drizzle + MySQL API!",
    docs: "/swagger untuk dokumentasi API",
  }))
  .use(usersRoute)
  .listen(process.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

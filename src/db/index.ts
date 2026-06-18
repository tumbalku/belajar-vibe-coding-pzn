import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "mysql://root:password@localhost:3306/belajar_vibe";

// Menggunakan connection pool agar lebih andal dalam menangani banyak request simultan
export const connection = mysql.createPool(connectionString);

export const db = drizzle(connection, { schema, mode: "default" });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// pg connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false  // 👈 add this
    }
    // e.g. postgresql://user:password@localhost:5432/tododb
});

// drizzle wraps the pool and knows about your schema
export const db = drizzle(pool, { schema });
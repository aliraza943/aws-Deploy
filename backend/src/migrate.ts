import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false    // 👈 fix
    }
});

const db = drizzle(pool);

async function main() {
    console.log("Running migrations...");
    await migrate(db, { migrationsFolder: "./drizzle" }); // reads SQL files from /drizzle folder
    console.log("Migrations done!");
    await pool.end();
}

main().catch((e) => {
    console.error("errror", e);
    process.exit(1);
});
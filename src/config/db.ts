import { Pool } from 'pg';
import * as dotenv from "dotenv";
import path from 'path';

// Load .env file (only loads if not already loaded)
if (!process.env.DB_USER) {
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
});

pool.on("connect", () => {
    console.log("Connection pool established with Database");
});

export default pool;

import { Pool } from 'pg';
import *  as dotenv from "dotenv";
import path from 'path';
dotenv.config();

// Debug: Show where dotenv is looking
const envPath = path.resolve(process.cwd(), '.env');
console.log('Looking for .env at:', envPath);

const result = dotenv.config();
console.log('Dotenv result:', result.error ? result.error.message : 'Success');
console.log('Loaded variables:', Object.keys(result.parsed || {}).length);

console.log(process.env.DB_USER);
console.log(process.env.DB_HOST);

console.log(process.env.DB_USER);
console.log(process.env.DB_HOST);

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

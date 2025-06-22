// Database connection 
import dotenv from "dotenv";
import pg from "pg";


dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  //Disable SSL in local dev
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: true }
      : false,
});

// Test the connection on startup
pool.connect()
  .then(() => console.log('✅ PostgreSQL connected'))
  .catch((err) => console.error('❌ PostgreSQL connection error', err));

// Export query function
export const query = (text, params) => pool.query(text, params);
export default pool;

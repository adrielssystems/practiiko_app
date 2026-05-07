require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  try {
    await pool.query("ALTER TABLE whatsapp_customers ADD COLUMN requires_human BOOLEAN DEFAULT FALSE;");
    console.log("Migration successful: Added requires_human column.");
  } catch (err) {
    if (err.code === '42701') { // column already exists
      console.log("Column requires_human already exists.");
    } else {
      console.error("Migration error:", err);
    }
  } finally {
    pool.end();
  }
}

migrate();

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  try {
    console.log("Iniciando migración de seguimiento...");

    await pool.query("ALTER TABLE whatsapp_customers ADD COLUMN IF NOT EXISTS followup_status VARCHAR(20) DEFAULT 'none'");
    await pool.query("ALTER TABLE whatsapp_customers ADD COLUMN IF NOT EXISTS followup_scheduled_at TIMESTAMP WITH TIME ZONE");
    console.log("Columnas añadidas a whatsapp_customers.");

    await pool.query("ALTER TABLE instagram_customers ADD COLUMN IF NOT EXISTS followup_status VARCHAR(20) DEFAULT 'none'");
    await pool.query("ALTER TABLE instagram_customers ADD COLUMN IF NOT EXISTS followup_scheduled_at TIMESTAMP WITH TIME ZONE");
    console.log("Columnas añadidas a instagram_customers.");

    console.log("Migración completada con éxito.");
  } catch (error) {
    console.error("Error en la migración:", error);
  } finally {
    pool.end();
  }
}

migrate();

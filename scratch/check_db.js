const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: "postgres://postgres:fj1zgdhooiw46ig6dwhk@lume1_db:5432/practiiko?sslmode=disable",
    ssl: false,
  });

  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products'
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();

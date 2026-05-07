const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: "postgres://postgres:fj1zgdhooiw46ig6dwhk@lume1_db:5432/practiiko?sslmode=disable",
    ssl: false,
  });

  try {
    const res = await pool.query(`
      SELECT
          conname AS constraint_name,
          confrelid::regclass AS referenced_table,
          af.attname AS referencing_column,
          rt.attname AS referenced_column,
          confupdtype AS on_update,
          confdeltype AS on_delete
      FROM pg_constraint c
      JOIN pg_attribute af ON af.attrelid = c.conrelid AND af.attnum = ANY(c.conkey)
      JOIN pg_attribute rt ON rt.attrelid = c.confrelid AND rt.attnum = ANY(c.confkey)
      WHERE c.conrelid = 'product_images'::regclass AND c.contype = 'f';
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();

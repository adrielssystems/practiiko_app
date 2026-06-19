const fs = require('fs');
const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.match(/DATABASE_URL=["']?(.*?)["']?(\n|$)/)[1].trim();
const { Client } = require('pg');
const client = new Client({ connectionString: dbUrl });

async function run() {
  await client.connect();
  try {
    await client.query("ALTER TABLE products ADD COLUMN colors JSONB DEFAULT '[]'::jsonb;");
    console.log("Column colors added successfully");
  } catch (err) {
    if (err.code === '42701') {
       console.log("Column colors already exists");
    } else {
       console.error("Error:", err);
    }
  }
  await client.end();
}
run();

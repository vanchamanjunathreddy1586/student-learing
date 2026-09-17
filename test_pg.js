import pg from 'pg';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) envVars[key.trim()] = val.join('=').trim();
});

const client = new pg.Client({
  connectionString: envVars.DATABASE_URL
});

async function test() {
  try {
    await client.connect();
    console.log("Connected successfully!");
    const res = await client.query('SELECT 1 as val');
    console.log(res.rows);
    await client.end();
  } catch(e) {
    console.error("Connection failed:", e.message);
  }
}

test();

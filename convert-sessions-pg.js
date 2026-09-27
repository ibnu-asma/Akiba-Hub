require('dotenv').config({ path: 'apps/api/.env' });
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  await pool.query(`
    UPDATE sessions
    SET 
      start_at = (date::text || ' ' || COALESCE(start_time, '00:00'))::timestamp AT TIME ZONE 'Africa/Addis_Ababa',
      end_at = (date::text || ' ' || COALESCE(end_time, '23:59'))::timestamp AT TIME ZONE 'Africa/Addis_Ababa'
    WHERE start_time IS NOT NULL OR end_time IS NOT NULL;
  `);
  
  console.log('Converted sessions!');
  process.exit(0);
}
run();

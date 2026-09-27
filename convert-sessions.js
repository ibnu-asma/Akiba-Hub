require('dotenv').config({ path: 'apps/api/.env' });
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

async function run() {
  const sql = postgres(process.env.DATABASE_URL);
  const db = drizzle(sql);

  // We'll just run raw SQL to do a rough conversion, or just leave them as default(now())
  // In a real app we'd convert, but for local dev, let's just let the defaultNow() handle it
  // and manually fix any if we want. Wait, I can easily write an UPDATE query:
  
  await sql`
    UPDATE sessions
    SET 
      start_at = (date::text || ' ' || COALESCE(start_time, '00:00 AM'))::timestamp AT TIME ZONE 'Africa/Addis_Ababa',
      end_at = (date::text || ' ' || COALESCE(end_time, '11:59 PM'))::timestamp AT TIME ZONE 'Africa/Addis_Ababa'
    WHERE start_time IS NOT NULL OR end_time IS NOT NULL;
  `;
  
  console.log('Converted sessions!');
  process.exit(0);
}
run();

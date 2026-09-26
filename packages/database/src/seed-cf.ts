import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { problems, users } from './schema.js';

const { Client } = pkg;

async function main() {
  const client = new Client({
    connectionString: 'postgres://hub:hub@localhost:5433/a2sv_hub',
  });
  await client.connect();
  const db = drizzle(client);

  const adminUser = await db.select().from(users).limit(1);

  await db.insert(problems).values({
    name: 'Watermelon (Contest)',
    platform: 'codeforces',
    difficulty: 'easy',
    tags: ['math'],
    link: 'https://codeforces.com/contest/4/problem/A',
    addedBy: adminUser[0].id,
  });

  console.log('Seeded Codeforces Watermelon Contest URL');
  await client.end();
}

main().catch(console.error);

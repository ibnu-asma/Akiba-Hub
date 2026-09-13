/**
 * Seed script — boots a minimal real dataset matching SPEC examples so the
 * API and web can be developed against realistic data.
 *
 * Run: pnpm db:seed   (requires migrated DB)
 */
import { createDb } from './client.js';
import { users, superGroups, groups, groupHeads, divisions, tracks } from './schema.js';
import { hash } from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://hub:hub@localhost:5433/a2sv_hub';

async function main() {
  const { db, pool } = createDb(DATABASE_URL);
  console.log('Seeding…');

  const passwordHash = await hash('a2sv-demo', 10);

  const [admins] = await db
    .insert(users)
    .values({
      email: 'admin@akibatech.com',
      name: 'Head of Academy',
      passwordHash,
      role: 'head_of_academy',
      country: 'Ethiopia',
      university: 'A2SV',
    })
    .returning({ id: users.id })
    .execute();

  void admins;

  // SuperGroup "Remote" + a couple of groups.
  const [remote] = await db
    .insert(superGroups)
    .values({ name: 'Remote', createdBy: admins.id })
    .returning({ id: superGroups.id })
    .execute();

  const [g5a] = await db
    .insert(groups)
    .values({ name: 'Remote Group 5A', shortName: 'G5A', country: 'Ethiopia', superGroupId: remote.id })
    .returning({ id: groups.id })
    .execute();

  const [g5b] = await db
    .insert(groups)
    .values({ name: 'Remote Group 5B', shortName: 'G5B', country: 'Ethiopia', superGroupId: remote.id })
    .returning({ id: groups.id })
    .execute();

  // HoE for G5A.
  const [hoe] = await db
    .insert(users)
    .values({
      email: 'head@akibatech.com',
      name: 'Head of Education',
      passwordHash,
      role: 'head_of_education',
      country: 'Ethiopia',
      university: 'A2SV',
      groupId: g5a.id,
      invitedById: admins.id,
    })
    .returning({ id: users.id })
    .execute();

  const [student] = await db
    .insert(users)
    .values({
      email: 'student@akibatech.com',
      name: 'Geleta Daba',
      passwordHash,
      role: 'student',
      country: 'Ethiopia',
      university: 'ASTU',
      groupId: g5a.id,
      invitedById: admins.id,
    })
    .returning({ id: users.id })
    .execute();

  void student;

  await db.insert(groupHeads).values({ groupId: g5a.id, userId: hoe.id }).execute();
  await db.insert(groupHeads).values({ groupId: g5b.id, userId: hoe.id }).execute();

  // Default divisions (Div 1 / Div 2 / Div 3).
  await db
    .insert(divisions)
    .values([
      { name: 'Div 1', minRating: 1400, maxRating: 4000, sortOrder: 1 },
      { name: 'Div 2', minRating: 1200, maxRating: 1399, sortOrder: 2 },
      { name: 'Div 3', minRating: 0, maxRating: 1199, sortOrder: 3 },
    ])
    .onConflictDoNothing()
    .execute();

  // The 5 documented track phases under the Remote supergroup.
  const phases = [
    ['PYTHON', 'Python Track'],
    ['PHASE_I', 'Education Phase I'],
    ['CAMP_I', 'Camp I'],
    ['PHASE_II', 'Education Phase II'],
    ['CAMP_II', 'Camp II'],
  ] as const;
  await Promise.all(
    phases.map(async ([phase, name], i) => {
      await db.insert(tracks).values({ superGroupId: remote.id, phase, name, sortOrder: i }).execute();
    }),
  );

  console.log('Seed complete ✓');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
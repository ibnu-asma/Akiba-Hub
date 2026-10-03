#!/usr/bin/env node
import pg from 'pg';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dfvpmuh7y';
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'hub_avatars_unsigned';
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://hub:hub@localhost:5433/a2sv_hub';

async function migrate() {
  console.log(`[Cloudinary Migration] Cloud Name: ${CLOUD_NAME}`);
  console.log(`[Cloudinary Migration] Upload Preset: ${UPLOAD_PRESET}`);
  console.log(`[Cloudinary Migration] Connecting to DB...`);

  const pool = new pg.Pool({ connectionString: DATABASE_URL });

  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, avatar_url FROM users WHERE avatar_url LIKE 'data:image%' ORDER BY id;`
    );

    console.log(`Found ${rows.length} users with inline base64 avatars.`);
    if (rows.length === 0) {
      console.log('Nothing to migrate! All avatars are already external URLs or null.');
      return;
    }

    let totalBytesSaved = 0;
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const user = rows[i];
      const base64Len = user.avatar_url.length;
      console.log(`[${i + 1}/${rows.length}] Uploading avatar for "${user.name}" (${(base64Len / 1024).toFixed(1)} KB)...`);

      try {
        const formData = new FormData();
        formData.append('file', user.avatar_url);
        formData.append('upload_preset', UPLOAD_PRESET);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`  ❌ Failed to upload for "${user.name}":`, errText);
          continue;
        }

        const data = await res.json();
        const secureUrl = data.secure_url;

        await pool.query(`UPDATE users SET avatar_url = $1 WHERE id = $2`, [secureUrl, user.id]);
        totalBytesSaved += base64Len - secureUrl.length;
        successCount++;
        console.log(`  ✅ Migrated -> ${secureUrl}`);
      } catch (err) {
        console.error(`  ❌ Error processing user ${user.id}:`, err.message);
      }
    }

    console.log(`\n========================================`);
    console.log(`Migration completed!`);
    console.log(`- Successfully migrated: ${successCount} / ${rows.length} users`);
    console.log(`- Total DB text reclaimed: ${(totalBytesSaved / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`========================================`);
    console.log(`Tip: Run 'VACUUM FULL users;' in PostgreSQL to reclaim storage on disk.`);
  } finally {
    await pool.end();
  }
}

migrate().catch(console.error);

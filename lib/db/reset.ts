import { sql } from 'drizzle-orm';
import { db } from './drizzle';

async function resetDatabase() {
  console.log('Dropping all tables...');

  try {
    // Drop all tables in the correct order to avoid foreign key constraints
    await db.execute(sql`
      DROP TABLE IF EXISTS team_members CASCADE;
      DROP TABLE IF EXISTS diffs CASCADE;
      DROP TABLE IF EXISTS chat_messages CASCADE;
      DROP TABLE IF EXISTS projects CASCADE;
      DROP TABLE IF EXISTS activity_logs CASCADE;
      DROP TABLE IF EXISTS teams CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    console.log('All tables dropped successfully.');
  } catch (error) {
    console.error('Error dropping tables:', error);
    process.exit(1);
  }

  console.log('Database reset complete. Now run migrations and seed scripts.');
}

resetDatabase()
  .catch(error => {
    console.error('Database reset failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Reset process finished. Exiting...');
    process.exit(0);
  });

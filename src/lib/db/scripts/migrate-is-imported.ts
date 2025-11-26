#!/usr/bin/env node
/**
 * Data migration script to initialize isImported field for existing projects
 * This script populates the isImported field for projects that don't have it set,
 * based on whether their githubOwner matches NEXT_PUBLIC_GITHUB_WORKSPACE
 *
 * Can be run manually: npx tsx -r dotenv/config src/lib/db/scripts/migrate-is-imported.ts
 */

import { and, isNotNull, ne } from 'drizzle-orm';
import { db } from '../drizzle';
import { projects } from '../schema';

async function main() {
  const workspace = process.env.NEXT_PUBLIC_GITHUB_WORKSPACE || 'Kosuke-Org';

  console.log(`🚀 Migrating isImported field (workspace: ${workspace})\n`);

  try {
    console.log('Updating isImported for imported projects...\n');

    // Set isImported = true for projects where githubOwner != workspace
    await db
      .update(projects)
      .set({ isImported: true })
      .where(and(isNotNull(projects.githubOwner), ne(projects.githubOwner, workspace)));

    console.log('✅ Project import status migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

main();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const sqlPath = path.join(__dirname, '../../../init-db.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  try {
    // Start a transaction
    await query('BEGIN');

    // Create extensions
    await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Run schema
    await query(sql);

    await query('COMMIT');
    console.log('[DB] Migration completed successfully.');
  } catch (error) {
    await query('ROLLBACK');
    console.error('[DB] Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { query, end } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root so DATABASE_URL is available when run standalone
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const LESSONS_DIR = path.resolve(__dirname, '../../lessons');

async function seedTheoryLessons() {
  console.log('[SEED] Seeding theory lessons from:', LESSONS_DIR);

  if (!fs.existsSync(LESSONS_DIR)) {
    console.error('[SEED] Lessons directory not found:', LESSONS_DIR);
    process.exit(1);
  }

  const files = fs
    .readdirSync(LESSONS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.log('[SEED] No JSON lesson files found.');
    process.exit(0);
  }

  console.log(`[SEED] Found ${files.length} lesson file(s).`);

  for (const file of files) {
    const filePath = path.join(LESSONS_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const lesson = JSON.parse(raw);

    const {
      id,
      title,
      category,
      difficulty,
      description,
      estimatedMinutes,
      keyConcepts,
    } = lesson;

    // Store the full lesson JSON as the content field
    const content = JSON.stringify(lesson);
    const keyConceptsJson = JSON.stringify(keyConcepts ?? []);

    try {
      await query(
        `INSERT INTO theory_lessons (id, title, category, difficulty, description, estimated_minutes, key_concepts, content)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           category = EXCLUDED.category,
           difficulty = EXCLUDED.difficulty,
           description = EXCLUDED.description,
           estimated_minutes = EXCLUDED.estimated_minutes,
           key_concepts = EXCLUDED.key_concepts,
           content = EXCLUDED.content`,
        [id, title, category, difficulty, description, estimatedMinutes ?? 15, keyConceptsJson, content]
      );
      console.log(`  [OK] ${id}`);
    } catch (err) {
      console.error(`  [FAIL] ${id}:`, err);
    }
  }

  console.log('[SEED] Done.');
  await end();
}

seedTheoryLessons();

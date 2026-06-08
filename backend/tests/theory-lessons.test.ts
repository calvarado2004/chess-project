import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = path.resolve(__dirname, '../lessons');

const CATEGORIES = ['openings', 'middlegame', 'endings', 'fundamentals'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

interface Position { fen: string; commentary: string; expectedMove?: string; hints?: string[]; }
interface Section { title: string; content: string; positions: Position[]; }
interface Exercise { fen: string; title: string; description: string; targetColor: 'w' | 'b'; expectedMoves: string[]; }
interface Lesson {
  id: string; title: string; category: string; difficulty: string;
  description: string; estimatedMinutes: number; keyConcepts: string[];
  sections: Section[]; exercises?: Exercise[];
}

function loadLessons(): { file: string; lesson: Lesson }[] {
  const files = fs.readdirSync(LESSONS_DIR).filter((f) => f.endsWith('.json'));
  return files.map((file) => ({
    file,
    lesson: JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, file), 'utf-8')) as Lesson,
  }));
}

// Validates the piece-placement field of a FEN: 8 ranks, each summing to 8
// squares, only legal piece chars, and no duplicate kings. This mirrors what
// the frontend board parser requires to render a position correctly. (Some
// simplified teaching diagrams intentionally omit a king, so kings are capped
// at one per side rather than required.)
function assertValidFEN(fen: string, ctx: string): void {
  const placement = fen.split(' ')[0];
  const ranks = placement.split('/');
  assert.equal(ranks.length, 8, `${ctx}: FEN must have 8 ranks -> ${fen}`);
  let wk = 0;
  let bk = 0;
  for (const rank of ranks) {
    let sum = 0;
    for (const ch of rank) {
      if (/\d/.test(ch)) {
        sum += parseInt(ch, 10);
      } else {
        assert.match(ch, /[pnbrqkPNBRQK]/, `${ctx}: illegal piece char '${ch}' -> ${fen}`);
        sum += 1;
        if (ch === 'K') wk += 1;
        if (ch === 'k') bk += 1;
      }
    }
    assert.equal(sum, 8, `${ctx}: rank '${rank}' must sum to 8 -> ${fen}`);
  }
  assert.ok(wk <= 1, `${ctx}: more than one white king -> ${fen}`);
  assert.ok(bk <= 1, `${ctx}: more than one black king -> ${fen}`);
}

const lessons = loadLessons();

test('there is at least one lesson file', () => {
  assert.ok(lessons.length > 0, 'expected lesson JSON files in backend/lessons');
});

test('lesson id matches its filename', () => {
  for (const { file, lesson } of lessons) {
    assert.equal(`${lesson.id}.json`, file, `id '${lesson.id}' should match file '${file}'`);
  }
});

test('lesson ids are unique', () => {
  const ids = lessons.map((l) => l.lesson.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate lesson ids found');
});

test('every lesson has required fields with valid values', () => {
  for (const { file, lesson } of lessons) {
    assert.ok(lesson.id && typeof lesson.id === 'string', `${file}: missing id`);
    assert.ok(lesson.title && typeof lesson.title === 'string', `${file}: missing title`);
    assert.ok(CATEGORIES.includes(lesson.category), `${file}: bad category '${lesson.category}'`);
    assert.ok(DIFFICULTIES.includes(lesson.difficulty), `${file}: bad difficulty '${lesson.difficulty}'`);
    assert.ok(lesson.description?.length > 0, `${file}: missing description`);
    assert.ok(Number.isInteger(lesson.estimatedMinutes) && lesson.estimatedMinutes > 0, `${file}: bad estimatedMinutes`);
    assert.ok(Array.isArray(lesson.keyConcepts) && lesson.keyConcepts.length > 0, `${file}: missing keyConcepts`);
    assert.ok(Array.isArray(lesson.sections) && lesson.sections.length > 0, `${file}: missing sections`);
  }
});

test('every section has a title and content', () => {
  for (const { file, lesson } of lessons) {
    for (const [i, section] of lesson.sections.entries()) {
      assert.ok(section.title?.length > 0, `${file} section[${i}]: missing title`);
      assert.ok(section.content?.length > 0, `${file} section[${i}]: missing content`);
      assert.ok(Array.isArray(section.positions), `${file} section[${i}]: positions must be an array`);
    }
  }
});

test('every lesson has at least one position to display', () => {
  for (const { file, lesson } of lessons) {
    const total = lesson.sections.reduce((sum, s) => sum + (s.positions?.length ?? 0), 0);
    assert.ok(total > 0, `${file}: lesson has no positions at all`);
  }
});

test('every position FEN is valid and renderable', () => {
  for (const { file, lesson } of lessons) {
    for (const [si, section] of lesson.sections.entries()) {
      for (const [pi, pos] of section.positions.entries()) {
        assertValidFEN(pos.fen, `${file} section[${si}] position[${pi}]`);
        assert.ok(pos.commentary?.length > 0, `${file} section[${si}] position[${pi}]: missing commentary`);
      }
    }
  }
});

test('every exercise FEN is valid and well-formed', () => {
  for (const { file, lesson } of lessons) {
    for (const [ei, ex] of (lesson.exercises ?? []).entries()) {
      assertValidFEN(ex.fen, `${file} exercise[${ei}]`);
      assert.ok(['w', 'b'].includes(ex.targetColor), `${file} exercise[${ei}]: bad targetColor`);
      assert.ok(Array.isArray(ex.expectedMoves) && ex.expectedMoves.length > 0, `${file} exercise[${ei}]: needs expectedMoves`);
    }
  }
});

test('all four categories are represented', () => {
  const present = new Set(lessons.map((l) => l.lesson.category));
  for (const cat of CATEGORIES) {
    assert.ok(present.has(cat), `no lessons found for category '${cat}'`);
  }
});

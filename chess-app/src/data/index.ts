import type { TheoryLesson, TheoryProgress } from './theory/types';

// ===================== Lesson Data (offline-first) =====================
// Lessons are bundled as JSON so they work fully offline. They are
// auto-discovered from the lessons folder, so dropping a new validated
// JSON file in there is all that is needed to add a lesson — no manual
// import list to keep in sync.

const lessonModules = import.meta.glob<{ default: TheoryLesson }>(
  './theory/lessons/*.json',
  { eager: true },
);

// Order lessons by category (matching the category cards), then by
// difficulty (beginner -> advanced), then alphabetically by title, so each
// category reads as a sensible learning progression.
const CATEGORY_ORDER: Record<string, number> = {
  openings: 0,
  middlegame: 1,
  endings: 2,
  fundamentals: 3,
};
const DIFFICULTY_ORDER: Record<string, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

export const lessons: TheoryLesson[] = (
  Object.values(lessonModules).map((m) => m.default) as TheoryLesson[]
).sort((a, b) => {
  const cat = (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99);
  if (cat !== 0) return cat;
  const diff = (DIFFICULTY_ORDER[a.difficulty] ?? 99) - (DIFFICULTY_ORDER[b.difficulty] ?? 99);
  if (diff !== 0) return diff;
  return a.title.localeCompare(b.title);
});

// ===================== Categories =====================
export const categories = [
  {
    id: 'openings',
    title: 'Openings',
    icon: '♟',
    description: 'Learn fundamental opening principles, popular openings, and how to develop your pieces effectively.',
    color: '#89b4fa',
  },
  {
    id: 'middlegame',
    title: 'Middlegame',
    icon: '⚔',
    description: 'Study tactics, piece activity, attacking plans, and pawn structures in the middlegame.',
    color: '#f9e2af',
  },
  {
    id: 'endings',
    title: 'Endings',
    icon: '👑',
    description: 'Master king and pawn endings, opposition, key squares, and essential endgame technique.',
    color: '#a6e3a1',
  },
  {
    id: 'fundamentals',
    title: 'Fundamentals & Tips',
    icon: '💡',
    description: 'Build lasting chess skill: core principles, common mistakes, calculation, evaluation, and how to study and improve.',
    color: '#f5c2e7',
  },
] as const;

export type TheoryCategoryId = (typeof categories)[number]['id'];

// ===================== Helpers =====================
export function getLessonsByCategory(category: string): TheoryLesson[] {
  return lessons.filter((l) => l.category === category);
}

export function getLessonById(id: string): TheoryLesson | undefined {
  return lessons.find((l) => l.id === id);
}

// ===================== Position Counter Helpers =====================
// The lesson UI shows a "X / Y" counter. The sequential number must count
// actual positions across sections — NOT the packed (section*10 + position)
// encoding used for stored progress, which produced nonsense like "22 / 9".

type SectionLike = { positions: unknown[] };

export function totalPositionCount(sections: SectionLike[]): number {
  return sections.reduce((sum, s) => sum + s.positions.length, 0);
}

export function sequentialPositionIndex(
  sections: SectionLike[],
  currentSection: number,
  currentPosition: number,
): number {
  return (
    sections
      .slice(0, currentSection)
      .reduce((sum, s) => sum + s.positions.length, 0) + currentPosition
  );
}

// ===================== Local Storage Progress =====================
const PROGRESS_KEY = 'chess-theory-progress';

export function loadLocalProgress(): Record<string, TheoryProgress> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveLocalProgress(progress: Record<string, TheoryProgress>): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // localStorage full or unavailable
  }
}

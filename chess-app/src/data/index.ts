import type { TheoryLesson, TheoryProgress } from './theory/types';

// ===================== Lesson Data (offline-first) =====================
// Lessons are bundled as JSON so they work fully offline.

import italianGame from './theory/lessons/italian-game.json';
import sicilianDefense from './theory/lessons/sicilian-defense.json';
import openingsPrinciples from './theory/lessons/openings-principles.json';
import tacticalMotifs from './theory/lessons/tactical-motifs.json';
import pieceActivity from './theory/lessons/piece-activity.json';
import attackingTheKing from './theory/lessons/attacking-the-king.json';
import pawnStructures from './theory/lessons/pawn-structures.json';
import kingAndPawn from './theory/lessons/king-and-pawn.json';
import rookEndings from './theory/lessons/rook-endings.json';
import queenEndings from './theory/lessons/queen-endings.json';
import bishopEndings from './theory/lessons/bishop-endings.json';
import knightEndings from './theory/lessons/knight-endings.json';
import blockedPawns from './theory/lessons/blocked-pawns.json';
import minorPieceEndings from './theory/lessons/minor-piece-endings.json';

// Openings (new)
import ruyLopez from './theory/lessons/ruy-lopez.json';
import frenchDefense from './theory/lessons/french-defense.json';
import caroKann from './theory/lessons/caro-kann.json';
import queensGambit from './theory/lessons/queens-gambit.json';
import kingsIndian from './theory/lessons/kings-indian.json';
import englishOpening from './theory/lessons/english-opening.json';
import scandinavian from './theory/lessons/scandinavian.json';
import slavDefense from './theory/lessons/slav-defense.json';
import londonSystem from './theory/lessons/london-system.json';
import scotchGame from './theory/lessons/scotch-game.json';

// Middlegame (new)
import openFilesRooks from './theory/lessons/open-files-rooks.json';
import outposts from './theory/lessons/outposts.json';
import bishopPair from './theory/lessons/bishop-pair.json';
import pawnBreaks from './theory/lessons/pawn-breaks.json';

// Endings (new)
import oppositionTriangulation from './theory/lessons/opposition-triangulation.json';
import lucenaPhilidor from './theory/lessons/lucena-philidor.json';
import zugzwang from './theory/lessons/zugzwang.json';
import fortressDraws from './theory/lessons/fortress-draws.json';

// Fundamentals & Tips (new category)
import chessFundamentals from './theory/lessons/chess-fundamentals.json';
import commonMistakes from './theory/lessons/common-mistakes.json';
import calculationVisualization from './theory/lessons/calculation-visualization.json';
import evaluatingPositions from './theory/lessons/evaluating-positions.json';
import studyImprovement from './theory/lessons/study-improvement.json';

export const lessons: TheoryLesson[] = [
  italianGame,
  sicilianDefense,
  openingsPrinciples,
  ruyLopez,
  frenchDefense,
  caroKann,
  queensGambit,
  kingsIndian,
  englishOpening,
  scandinavian,
  slavDefense,
  londonSystem,
  scotchGame,
  tacticalMotifs,
  pieceActivity,
  attackingTheKing,
  pawnStructures,
  openFilesRooks,
  outposts,
  bishopPair,
  pawnBreaks,
  kingAndPawn,
  rookEndings,
  queenEndings,
  bishopEndings,
  knightEndings,
  minorPieceEndings,
  blockedPawns,
  oppositionTriangulation,
  lucenaPhilidor,
  zugzwang,
  fortressDraws,
  chessFundamentals,
  commonMistakes,
  calculationVisualization,
  evaluatingPositions,
  studyImprovement,
] as unknown as TheoryLesson[];

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

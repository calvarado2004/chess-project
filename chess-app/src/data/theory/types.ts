export type TheoryCategory = 'openings' | 'middlegame' | 'endings' | 'fundamentals';

export interface TheoryPosition {
  fen: string;
  commentary: string;
  expectedMove?: string;
  hints?: string[];
}

export interface TheoryExercise {
  fen: string;
  title: string;
  description: string;
  targetColor: 'w' | 'b';
  expectedMoves: string[];
  hints?: string[];
  maxMoves?: number;
}

export interface TheoryLesson {
  id: string;
  title: string;
  category: TheoryCategory;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  estimatedMinutes: number;
  keyConcepts: string[];
  sections: TheorySection[];
  exercises?: TheoryExercise[];
}

export interface TheorySection {
  title: string;
  content: string;
  positions: TheoryPosition[];
}

export interface TheoryProgress {
  lessonId: string;
  completed: boolean;
  lastPositionIndex: number;
  exerciseScore: number;
  completedAt?: string;
}

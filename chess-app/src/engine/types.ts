// ===================== Piece IDs =====================
export const EMPTY = 0;
export const W_PAWN = 1, W_KNIGHT = 2, W_BISHOP = 3, W_ROOK = 4, W_QUEEN = 5, W_KING = 6;
export const B_PAWN = 7, B_KNIGHT = 8, B_BISHOP = 9, B_ROOK = 10, B_QUEEN = 11, B_KING = 12;

// ===================== Piece Unicode =====================
export const PIECE_UNICODE: Record<number, string> = {
  [W_KING]:   '\u265A', [W_QUEEN]:  '\u265B', [W_ROOK]:   '\u265C',
  [W_BISHOP]: '\u265D', [W_KNIGHT]: '\u265E', [W_PAWN]:   '\u265F',
  [B_KING]:   '\u265A', [B_QUEEN]:  '\u265B', [B_ROOK]:   '\u265C',
  [B_BISHOP]: '\u265D', [B_KNIGHT]: '\u265E', [B_PAWN]:   '\u265F',
};

export const PIECE_TYPE: Record<number, string> = {
  [W_PAWN]: 'p', [W_KNIGHT]: 'n', [W_BISHOP]: 'b', [W_ROOK]: 'r', [W_QUEEN]: 'q', [W_KING]: 'k',
  [B_PAWN]: 'p', [B_KNIGHT]: 'n', [B_BISHOP]: 'b', [B_ROOK]: 'r', [B_QUEEN]: 'q', [B_KING]: 'k',
};

export const PIECE_VALUE: Record<number, number> = {
  [W_PAWN]: 1, [W_KNIGHT]: 3, [W_BISHOP]: 3, [W_ROOK]: 5, [W_QUEEN]: 9, [W_KING]: 0,
  [B_PAWN]: 1, [B_KNIGHT]: 3, [B_BISHOP]: 3, [B_ROOK]: 5, [B_QUEEN]: 9, [B_KING]: 0,
};

// ===================== Helpers =====================
export function isWhite(p: number): boolean { return p >= W_PAWN && p <= W_KING; }
export function isBlack(p: number): boolean { return p >= B_PAWN && p <= B_KING; }
export function colorOf(p: number): 'w' | 'b' | null {
  if (isWhite(p)) return 'w';
  if (isBlack(p)) return 'b';
  return null;
}
export function isFriendly(p: number, c: 'w' | 'b'): boolean { return c === 'w' ? isWhite(p) : isBlack(p); }
export function isEnemy(p: number, c: 'w' | 'b'): boolean { return c === 'w' ? isBlack(p) : isWhite(p); }

// ===================== Coordinates =====================
export const FILES = ['a','b','c','d','e','f','g','h'] as const;
export const RANKS = ['8','7','6','5','4','3','2','1'] as const;

export interface Coord { row: number; col: number; }

export function rowColToFileRank(row: number, col: number): string {
  return FILES[col] + RANKS[row];
}

export function fileRankToRowCol(sq: string): Coord {
  const f = sq.charCodeAt(0) - 97;
  const r = 8 - parseInt(sq[1], 10);
  return { row: r, col: f };
}

// ===================== Move =====================
export interface ChessMove {
  from: Coord;
  to: Coord;
  promotion?: string;
  castle?: 'K' | 'Q';
  enPassant?: boolean;
}

// ===================== Game Status =====================
export type GameStatus =
  | 'normal'
  | 'check'
  | 'checkmate'
  | 'stalemate'
  | 'white_time_win'
  | 'black_time_win';

// ===================== Castling Rights =====================
export interface CastlingRights {
  wK: boolean; wQ: boolean;
  bK: boolean; bQ: boolean;
}

// ===================== Engine =====================
export type EngineStatus = 'unavailable' | 'ready' | 'thinking' | 'analyzing' | 'error';
export type EngineEvalType = 'cp' | 'mate';

export interface EngineEval {
  type: EngineEvalType;
  whiteValue: number;
}

export type EngineRequestType = null | 'analysis' | 'move';

export interface EngineConfig {
  skill: number;
  elo: number;
  movetime: number;
}

export const STOCKFISH_ELO_LEVELS = Array.from(
  { length: 20 },
  (_, index) => 500 + index * 100,
);

export const STRENGTH_MAP: Record<string, EngineConfig> = Object.fromEntries(
  STOCKFISH_ELO_LEVELS.map((elo) => {
    const normalized = (elo - 500) / (2400 - 500);
    return [
      `elo-${elo}`,
      {
        skill: Math.round(normalized * 20),
        elo,
        movetime: Math.round(150 + normalized * 1050),
      },
    ];
  }),
);

// ===================== Game Mode =====================
export type GameMode = 'hvh' | 'hwe' | 'hbe' | 'online';

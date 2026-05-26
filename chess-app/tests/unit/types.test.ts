import { describe, it, expect } from 'vitest';
import {
  EMPTY,
  W_PAWN, W_KNIGHT, W_BISHOP, W_ROOK, W_QUEEN, W_KING,
  B_PAWN, B_KNIGHT, B_BISHOP, B_ROOK, B_QUEEN, B_KING,
  isWhite, isBlack, colorOf, isFriendly, isEnemy,
  PIECE_UNICODE, PIECE_SVG, PIECE_TYPE, PIECE_VALUE,
  FILES, RANKS, rowColToFileRank, fileRankToRowCol,
  STRENGTH_MAP, STOCKFISH_ELO_LEVELS,
} from '../../src/engine/types';

describe('Piece IDs', () => {
  it('should have correct empty value', () => {
    expect(EMPTY).toBe(0);
  });

  it('should have sequential white piece IDs', () => {
    expect(W_PAWN).toBe(1);
    expect(W_KNIGHT).toBe(2);
    expect(W_BISHOP).toBe(3);
    expect(W_ROOK).toBe(4);
    expect(W_QUEEN).toBe(5);
    expect(W_KING).toBe(6);
  });

  it('should have sequential black piece IDs', () => {
    expect(B_PAWN).toBe(7);
    expect(B_KNIGHT).toBe(8);
    expect(B_BISHOP).toBe(9);
    expect(B_ROOK).toBe(10);
    expect(B_QUEEN).toBe(11);
    expect(B_KING).toBe(12);
  });
});

describe('isWhite / isBlack / colorOf', () => {
  it('should identify all white pieces', () => {
    [W_PAWN, W_KNIGHT, W_BISHOP, W_ROOK, W_QUEEN, W_KING].forEach(p => {
      expect(isWhite(p)).toBe(true);
      expect(isBlack(p)).toBe(false);
      expect(colorOf(p)).toBe('w');
    });
  });

  it('should identify all black pieces', () => {
    [B_PAWN, B_KNIGHT, B_BISHOP, B_ROOK, B_QUEEN, B_KING].forEach(p => {
      expect(isWhite(p)).toBe(false);
      expect(isBlack(p)).toBe(true);
      expect(colorOf(p)).toBe('b');
    });
  });

  it('should return null for empty', () => {
    expect(colorOf(EMPTY)).toBe(null);
    expect(isWhite(EMPTY)).toBe(false);
    expect(isBlack(EMPTY)).toBe(false);
  });
});

describe('isFriendly / isEnemy', () => {
  it('should identify friendly white pieces', () => {
    expect(isFriendly(W_PAWN, 'w')).toBe(true);
    expect(isFriendly(W_KING, 'w')).toBe(true);
    expect(isFriendly(B_PAWN, 'w')).toBe(false);
    expect(isFriendly(B_KING, 'w')).toBe(false);
  });

  it('should identify friendly black pieces', () => {
    expect(isFriendly(B_PAWN, 'b')).toBe(true);
    expect(isFriendly(B_KING, 'b')).toBe(true);
    expect(isFriendly(W_PAWN, 'b')).toBe(false);
    expect(isFriendly(W_KING, 'b')).toBe(false);
  });

  it('should identify enemy pieces', () => {
    expect(isEnemy(B_PAWN, 'w')).toBe(true);
    expect(isEnemy(W_PAWN, 'b')).toBe(true);
    expect(isEnemy(W_PAWN, 'w')).toBe(false);
    expect(isEnemy(B_PAWN, 'b')).toBe(false);
  });
});

describe('PIECE_UNICODE', () => {
  it('should have unicode for all pieces', () => {
    [W_KING, W_QUEEN, W_ROOK, W_BISHOP, W_KNIGHT, W_PAWN,
     B_KING, B_QUEEN, B_ROOK, B_BISHOP, B_KNIGHT, B_PAWN].forEach(p => {
      expect(PIECE_UNICODE[p]).toBeDefined();
      expect(typeof PIECE_UNICODE[p]).toBe('string');
    });
  });

  it('should use same unicode symbol for white and black kings', () => {
    expect(PIECE_UNICODE[W_KING]).toBe(PIECE_UNICODE[B_KING]);
  });
});

describe('PIECE_SVG', () => {
  it('should have SVG paths for all pieces', () => {
    [W_PAWN, W_KNIGHT, W_BISHOP, W_ROOK, W_QUEEN, W_KING,
     B_PAWN, B_KNIGHT, B_BISHOP, B_ROOK, B_QUEEN, B_KING].forEach(p => {
      expect(PIECE_SVG[p]).toMatch(/^staunty\/(white|black)\w+\.svg$/);
    });
  });
});

describe('PIECE_TYPE', () => {
  it('should map all pieces to correct type letters', () => {
    expect(PIECE_TYPE[W_PAWN]).toBe('p');
    expect(PIECE_TYPE[W_KNIGHT]).toBe('n');
    expect(PIECE_TYPE[W_BISHOP]).toBe('b');
    expect(PIECE_TYPE[W_ROOK]).toBe('r');
    expect(PIECE_TYPE[W_QUEEN]).toBe('q');
    expect(PIECE_TYPE[W_KING]).toBe('k');
    expect(PIECE_TYPE[B_PAWN]).toBe('p');
    expect(PIECE_TYPE[B_KING]).toBe('k');
  });
});

describe('PIECE_VALUE', () => {
  it('should have correct piece values', () => {
    expect(PIECE_VALUE[W_PAWN]).toBe(1);
    expect(PIECE_VALUE[W_KNIGHT]).toBe(3);
    expect(PIECE_VALUE[W_BISHOP]).toBe(3);
    expect(PIECE_VALUE[W_ROOK]).toBe(5);
    expect(PIECE_VALUE[W_QUEEN]).toBe(9);
    expect(PIECE_VALUE[W_KING]).toBe(0);
  });

  it('should have same values for white and black', () => {
    expect(PIECE_VALUE[W_PAWN]).toBe(PIECE_VALUE[B_PAWN]);
    expect(PIECE_VALUE[W_KNIGHT]).toBe(PIECE_VALUE[B_KNIGHT]);
    expect(PIECE_VALUE[W_QUEEN]).toBe(PIECE_VALUE[B_QUEEN]);
  });
});

describe('Coordinate helpers', () => {
  it('should have correct FILES and RANKS', () => {
    expect(FILES).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    expect(RANKS).toEqual(['8', '7', '6', '5', '4', '3', '2', '1']);
  });

  it('should convert row/col to file/rank', () => {
    expect(rowColToFileRank(0, 0)).toBe('a8');
    expect(rowColToFileRank(7, 7)).toBe('h1');
    expect(rowColToFileRank(4, 4)).toBe('e4');
  });

  it('should convert file/rank to row/col', () => {
    expect(fileRankToRowCol('a8')).toEqual({ row: 0, col: 0 });
    expect(fileRankToRowCol('h1')).toEqual({ row: 7, col: 7 });
    expect(fileRankToRowCol('e4')).toEqual({ row: 4, col: 4 });
  });

  it('should be inverse operations', () => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = rowColToFileRank(r, c);
        const back = fileRankToRowCol(sq);
        expect(back).toEqual({ row: r, col: c });
      }
    }
  });
});

describe('STRENGTH_MAP', () => {
  it('should have 20 ELO levels from 500 to 2400', () => {
    expect(STOCKFISH_ELO_LEVELS).toEqual([
      500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400,
      1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400
    ]);
    expect(Object.keys(STRENGTH_MAP)).toHaveLength(20);
  });

  it('should have correct skill levels', () => {
    expect(STRENGTH_MAP['elo-500'].skill).toBe(0);
    expect(STRENGTH_MAP['elo-2400'].skill).toBe(20);
  });

  it('should have increasing movetime with ELO', () => {
    expect(STRENGTH_MAP['elo-500'].movetime).toBeLessThan(STRENGTH_MAP['elo-2400'].movetime);
  });

  it('should have uciElo undefined below 1320', () => {
    expect(STRENGTH_MAP['elo-500'].uciElo).toBeUndefined();
    expect(STRENGTH_MAP['elo-1300'].uciElo).toBeUndefined();
  });

  it('should have uciElo set at 1320+', () => {
    expect(STRENGTH_MAP['elo-1400'].uciElo).toBe(1400);
    expect(STRENGTH_MAP['elo-2400'].uciElo).toBe(2400);
  });

  it('should have decreasing random move chance with ELO', () => {
    expect(STRENGTH_MAP['elo-500'].randomMoveChance).toBe(0.45);
    expect(STRENGTH_MAP['elo-1300'].randomMoveChance).toBe(0.08);
    expect(STRENGTH_MAP['elo-1400'].randomMoveChance).toBe(0);
  });

  it('should have searchDepth set below 1320', () => {
    expect(STRENGTH_MAP['elo-500'].searchDepth).toBeDefined();
    expect(STRENGTH_MAP['elo-1300'].searchDepth).toBeDefined();
    expect(STRENGTH_MAP['elo-1400'].searchDepth).toBeUndefined();
  });

  it('should have decreasing candidate move count with ELO (below 1320)', () => {
    expect(STRENGTH_MAP['elo-500'].candidateMoveCount).toBeGreaterThan(1);
    expect(STRENGTH_MAP['elo-1400'].candidateMoveCount).toBe(1);
  });
});

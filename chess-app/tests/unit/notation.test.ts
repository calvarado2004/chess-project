import { describe, it, expect } from 'vitest';
import {
  EMPTY, W_KING, W_QUEEN, W_ROOK, W_BISHOP, W_KNIGHT, W_PAWN,
  B_KING, B_PAWN,
} from '../../src/engine/types';
import { createInitialState, createEmptyBoard } from '../../src/engine/logic';
import { generateFEN, generatePGN, parseUCIMove } from '../../src/engine/notation';

describe('generateFEN', () => {
  it('should generate standard starting position FEN', () => {
    const state = createInitialState();
    expect(generateFEN(state)).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  });

  it('should generate FEN after e4', () => {
    const state = createInitialState();
    state.board[6][4] = EMPTY;
    state.board[4][4] = W_PAWN;
    state.turn = 'b';
    state.enPassantTarget = { row: 5, col: 4 };
    state.halfmoveClock = 0;
    state.fullmoveNumber = 1;
    expect(generateFEN(state)).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
  });

  it('should generate FEN with no castling rights', () => {
    const state = createInitialState();
    state.castlingRights = { wK: false, wQ: false, bK: false, bQ: false };
    const fen = generateFEN(state);
    expect(fen).toContain(' - ');
  });

  it('should generate FEN with partial castling rights', () => {
    const state = createInitialState();
    state.castlingRights = { wK: true, wQ: false, bK: false, bQ: true };
    const fen = generateFEN(state);
    // FEN uses lowercase 'k' for black kingside
    expect(fen).toContain(' Kq ');
  });
});

describe('generatePGN', () => {
  it('should generate PGN with headers', () => {
    const state = createInitialState();
    state.moveHistory = ['e4', 'e5', 'Nf3'];
    state.turn = 'b';
    state.gameStatus = 'normal';

    const pgn = generatePGN(state);
    expect(pgn).toContain('[Event "Chess Game"]');
    expect(pgn).toContain('[Site "Local"]');
    expect(pgn).toContain('[Round "1"]');
    expect(pgn).toContain('1. e4 e5 2. Nf3');
    expect(pgn).toContain('*');
  });

  it('should generate correct result for checkmate', () => {
    const state = createInitialState();
    state.moveHistory = ['e4', 'e5'];
    state.turn = 'w';
    state.gameStatus = 'checkmate';
    state.gameOver = true;

    const pgn = generatePGN(state);
    expect(pgn).toContain('0-1');
  });

  it('should generate correct result for stalemate', () => {
    const state = createInitialState();
    state.moveHistory = [];
    state.turn = 'b';
    state.gameStatus = 'stalemate';
    state.gameOver = true;

    const pgn = generatePGN(state);
    expect(pgn).toContain('1/2-1/2');
  });
});

describe('parseUCIMove', () => {
  it('should parse basic UCI move', () => {
    const move = parseUCIMove('e2e4');
    expect(move).toEqual({
      from: { row: 6, col: 4 },
      to: { row: 4, col: 4 },
    });
  });

  it('should parse UCI move with promotion', () => {
    const move = parseUCIMove('e7e8q');
    expect(move).toEqual({
      from: { row: 1, col: 4 },
      to: { row: 0, col: 4 },
      promotion: 'q',
    });
  });

  it('should return null for invalid UCI string', () => {
    expect(parseUCIMove('abc')).toBeNull();
    expect(parseUCIMove('')).toBeNull();
  });

  it('should parse all promotion pieces', () => {
    expect(parseUCIMove('e7e8q')!.promotion).toBe('q');
    expect(parseUCIMove('e7e8r')!.promotion).toBe('r');
    expect(parseUCIMove('e7e8b')!.promotion).toBe('b');
    expect(parseUCIMove('e7e8n')!.promotion).toBe('n');
  });

  it('should parse corner squares', () => {
    const move = parseUCIMove('a1h8');
    expect(move!.from).toEqual({ row: 7, col: 0 });
    expect(move!.to).toEqual({ row: 0, col: 7 });
  });
});

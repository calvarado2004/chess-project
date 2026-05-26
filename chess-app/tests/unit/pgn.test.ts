import { describe, it, expect } from 'vitest';
import { parsePGN, replayMovesFromPGN } from '../../src/engine/pgn';
import { W_KING, W_ROOK, W_PAWN, B_PAWN, EMPTY } from '../../src/engine/types';

describe('parsePGN', () => {
  it('should parse basic PGN with headers and moves', () => {
    const pgn = `[Event "Test Game"]
[Site "Local"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0`;

    const parsed = parsePGN(pgn);
    expect(parsed.headers.Event).toBe('Test Game');
    expect(parsed.headers.Site).toBe('Local');
    expect(parsed.result).toBe('1-0');
    expect(parsed.moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
  });

  it('should strip comments and NAGs', () => {
    const pgn = `1. e4 {good move} e5 $1 2. Nf3 Nc6 *`;
    const parsed = parsePGN(pgn);
    expect(parsed.moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    expect(parsed.result).toBe('*');
  });

  it('should handle variations in parentheses', () => {
    const pgn = `1. e4 (1. d4 d5) e5 2. Nf3 *`;
    const parsed = parsePGN(pgn);
    // Variations are stripped
    expect(parsed.moves).toContain('e4');
    expect(parsed.moves).toContain('e5');
  });

  it('should handle draw result', () => {
    const pgn = `1. e4 e5 1/2-1/2`;
    const parsed = parsePGN(pgn);
    expect(parsed.result).toBe('1/2-1/2');
    expect(parsed.moves).toEqual(['e4', 'e5']);
  });

  it('should handle empty PGN', () => {
    const parsed = parsePGN('');
    expect(parsed.moves).toEqual([]);
    expect(parsed.headers).toEqual({});
    expect(parsed.result).toBe('*');
  });

  it('should handle PGN with only headers', () => {
    const pgn = `[Event "Empty"]
[Site "Nowhere"]`;
    const parsed = parsePGN(pgn);
    expect(parsed.headers.Event).toBe('Empty');
    expect(parsed.moves).toEqual([]);
  });

  it('should handle multi-line PGN', () => {
    const pgn = `1. e4
e5
2. Nf3
Nc6
3. Bb5
a6 *`;
    const parsed = parsePGN(pgn);
    expect(parsed.moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']);
  });
});

describe('replayMovesFromPGN', () => {
  it('should replay basic pawn moves', () => {
    const replay = replayMovesFromPGN(['e4', 'e5']);
    expect(replay.moveHistory).toEqual(['e4', 'e5']);
    expect(replay.turn).toBe('w');
    expect(replay.board[4][4]).toBe(W_PAWN); // e4 white pawn
    expect(replay.board[3][4]).toBe(B_PAWN); // e5 black pawn
  });

  it('should handle castling', () => {
    const replay = replayMovesFromPGN(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'O-O']);
    expect(replay.moveHistory).toContain('O-O');
    expect(replay.board[7][6]).toBe(W_KING);  // king on g1
    expect(replay.board[7][5]).toBe(W_ROOK);  // rook on f1
    expect(replay.castlingRights.wK).toBe(false);
    expect(replay.castlingRights.wQ).toBe(false);
  });

  it('should handle queenside castling', () => {
    const replay = replayMovesFromPGN(['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'Nbd7', 'cxd5', 'Nxd5', 'Bxe7', 'Qxe7', 'O-O-O']);
    expect(replay.moveHistory).toContain('O-O-O');
    // White king should be on c1
    expect(replay.board[7][2]).toBe(W_KING);
    expect(replay.board[7][3]).toBe(W_ROOK);
  });

  it('should handle pawn captures', () => {
    const replay = replayMovesFromPGN(['e4', 'e5', 'Nf3', 'd5', 'exd5']);
    expect(replay.moveHistory).toContain('exd5');
    // White pawn captured on d5
    expect(replay.board[3][3]).toBe(W_PAWN); // d5 has white pawn
  });

  it('should handle promotion notation', () => {
    // Set up a position where promotion happens
    const replay = replayMovesFromPGN(['a4', 'a5']);
    expect(replay.moveHistory).toEqual(['a4', 'a5']);
  });

  it('should update en passant target', () => {
    const replay = replayMovesFromPGN(['e4', 'c5', 'Nf3', 'd6', 'd4']);
    // After d2-d4 (2-square pawn push), en passant target is d3 (row 5, col 3)
    expect(replay.enPassantTarget).toEqual({ row: 5, col: 3 });
  });

  it('should handle en passant capture', () => {
    const replay = replayMovesFromPGN(['e4', 'c5', 'e5', 'd5', 'exd6']);
    expect(replay.moveHistory).toContain('exd6');
    // The captured pawn on d5 should be removed
    expect(replay.board[3][3]).toBe(EMPTY); // d5 is empty
  });

  it('should return correct last move', () => {
    const replay = replayMovesFromPGN(['e4', 'e5', 'Nf3']);
    expect(replay.lastMove).toBeDefined();
    // Nf3: knight from g1 to f3
    expect(replay.lastMove!.to).toEqual({ row: 5, col: 5 });
  });

  it('should handle empty move list', () => {
    const replay = replayMovesFromPGN([]);
    expect(replay.moveHistory).toEqual([]);
    expect(replay.turn).toBe('w');
    expect(replay.enPassantTarget).toBeNull();
  });
});

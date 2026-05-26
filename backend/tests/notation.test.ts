import assert from 'node:assert/strict';
import test from 'node:test';
import { generateFEN, parseUCIMove } from '../src/engine/notation.js';
import { initBoard } from '../src/engine/logic.js';
import { EMPTY, B_KING, B_QUEEN, B_ROOK, B_BISHOP, B_KNIGHT } from '../src/engine/types.js';

// ---------- generateFEN ----------

test('generateFEN produces standard starting position', () => {
  const board = initBoard();
  const fen = generateFEN(
    board, 'w',
    { wK: true, wQ: true, bK: true, bQ: true },
    null, 0, 1
  );
  assert.equal(fen, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
});

test('generateFEN produces correct FEN after e2e4', () => {
  const board = initBoard();
  // manually move white pawn e2->e4
  board[4][4] = board[6][4];
  board[6][4] = EMPTY;
  const fen = generateFEN(
    board, 'b',
    { wK: true, wQ: true, bK: true, bQ: true },
    null, 0, 1
  );
  assert.equal(fen, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
});

test('generateFEN handles empty board', () => {
  const board = Array.from({ length: 8 }, () => Array(8).fill(EMPTY));
  const fen = generateFEN(
    board, 'w',
    { wK: false, wQ: false, bK: false, bQ: false },
    null, 0, 1
  );
  assert.equal(fen, '8/8/8/8/8/8/8/8 w - - 0 1');
});

test('generateFEN handles no castling rights', () => {
  const board = Array.from({ length: 8 }, () => Array(8).fill(EMPTY));
  const fen = generateFEN(
    board, 'b',
    { wK: false, wQ: false, bK: false, bQ: false },
    null, 5, 10
  );
  assert.equal(fen, '8/8/8/8/8/8/8/8 b - - 5 10');
});

test('generateFEN handles partial castling rights', () => {
  const board = Array.from({ length: 8 }, () => Array(8).fill(EMPTY));
  const fen = generateFEN(
    board, 'w',
    { wK: true, wQ: false, bK: false, bQ: true },
    null, 0, 1
  );
  assert.equal(fen, '8/8/8/8/8/8/8/8 w Kq - 0 1');
});

test('generateFEN handles en passant target square', () => {
  const board = Array.from({ length: 8 }, () => Array(8).fill(EMPTY));
  board[4][4] = EMPTY; // just a pawn on e4 visually
  const fen = generateFEN(
    board, 'b',
    { wK: false, wQ: false, bK: false, bQ: false },
    { row: 5, col: 4 }, // e3 square (row 5 = rank 3)
    0, 1
  );
  assert.equal(fen, '8/8/8/8/8/8/8/8 b - e3 0 1');
});

test('generateFEN handles halfmove clock and fullmove number', () => {
  const board = Array.from({ length: 8 }, () => Array(8).fill(EMPTY));
  const fen = generateFEN(
    board, 'w',
    { wK: false, wQ: false, bK: false, bQ: false },
    null, 7, 25
  );
  assert.equal(fen, '8/8/8/8/8/8/8/8 w - - 7 25');
});

test('generateFEN handles black pieces lowercase', () => {
  const board = Array.from({ length: 8 }, () => Array(8).fill(EMPTY));
  board[0] = [B_ROOK, B_KNIGHT, B_BISHOP, B_QUEEN, B_KING, EMPTY, EMPTY, EMPTY];
  const fen = generateFEN(
    board, 'w',
    { wK: false, wQ: false, bK: false, bQ: false },
    null, 0, 1
  );
  assert.equal(fen, 'rnbqk3/8/8/8/8/8/8/8 w - - 0 1');
});

// ---------- parseUCIMove ----------

test('parseUCIMove parses basic move e2e4', () => {
  const move = parseUCIMove('e2e4');
  assert.ok(move, 'should parse');
  assert.deepEqual(move?.from, { row: 6, col: 4 });
  assert.deepEqual(move?.to, { row: 4, col: 4 });
});

test('parseUCIMove parses move with promotion', () => {
  const move = parseUCIMove('e7e8q');
  assert.ok(move, 'should parse');
  assert.deepEqual(move?.from, { row: 1, col: 4 });
  assert.deepEqual(move?.to, { row: 0, col: 4 });
  assert.equal(move?.promotion, 'q');
});

test('parseUCIMove parses promotion to knight', () => {
  const move = parseUCIMove('e7e8n');
  assert.ok(move, 'should parse');
  assert.equal(move?.promotion, 'n');
});

test('parseUCIMove parses uppercase promotion char', () => {
  const move = parseUCIMove('e7e8Q');
  assert.equal(move?.promotion, 'q');
});

test('parseUCIMove returns null for string shorter than 4 chars', () => {
  assert.strictEqual(parseUCIMove('e2'), null);
  assert.strictEqual(parseUCIMove('e'), null);
  assert.strictEqual(parseUCIMove(''), null);
});

test('parseUCIMove parses corner squares a1h8', () => {
  const move = parseUCIMove('a1h8');
  assert.ok(move, 'should parse');
  assert.deepEqual(move?.from, { row: 7, col: 0 });
  assert.deepEqual(move?.to, { row: 0, col: 7 });
});

test('parseUCIMove ignores invalid 5th char (not a piece)', () => {
  const move = parseUCIMove('e2e4x');
  assert.ok(move, 'should parse');
  assert.deepEqual(move?.from, { row: 6, col: 4 });
  assert.deepEqual(move?.to, { row: 4, col: 4 });
  assert.equal(move?.promotion, undefined);
});

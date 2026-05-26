import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EMPTY, W_PAWN, W_KNIGHT, W_BISHOP, W_ROOK, W_QUEEN, W_KING,
  B_PAWN, B_KNIGHT, B_BISHOP, B_ROOK, B_QUEEN, B_KING,
  PIECE_TYPE, PIECE_VALUE, PIECE_UNICODE,
  isWhite, isBlack, colorOf, isFriendly, isEnemy,
  FILES, RANKS, rowColToFileRank, fileRankToRowCol,
} from '../src/engine/types.js';

// ---------- Piece Constants ----------

test('EMPTY is 0', () => {
  assert.equal(EMPTY, 0);
});

test('white piece IDs are 1-6', () => {
  assert.equal(W_PAWN, 1);
  assert.equal(W_KNIGHT, 2);
  assert.equal(W_BISHOP, 3);
  assert.equal(W_ROOK, 4);
  assert.equal(W_QUEEN, 5);
  assert.equal(W_KING, 6);
});

test('black piece IDs are 7-12', () => {
  assert.equal(B_PAWN, 7);
  assert.equal(B_KNIGHT, 8);
  assert.equal(B_BISHOP, 9);
  assert.equal(B_ROOK, 10);
  assert.equal(B_QUEEN, 11);
  assert.equal(B_KING, 12);
});

// ---------- PIECE_TYPE ----------

test('PIECE_TYPE maps all white pieces correctly', () => {
  assert.equal(PIECE_TYPE[W_PAWN], 'p');
  assert.equal(PIECE_TYPE[W_KNIGHT], 'n');
  assert.equal(PIECE_TYPE[W_BISHOP], 'b');
  assert.equal(PIECE_TYPE[W_ROOK], 'r');
  assert.equal(PIECE_TYPE[W_QUEEN], 'q');
  assert.equal(PIECE_TYPE[W_KING], 'k');
});

test('PIECE_TYPE maps all black pieces correctly', () => {
  assert.equal(PIECE_TYPE[B_PAWN], 'p');
  assert.equal(PIECE_TYPE[B_KNIGHT], 'n');
  assert.equal(PIECE_TYPE[B_BISHOP], 'b');
  assert.equal(PIECE_TYPE[B_ROOK], 'r');
  assert.equal(PIECE_TYPE[B_QUEEN], 'q');
  assert.equal(PIECE_TYPE[B_KING], 'k');
});

// ---------- PIECE_VALUE ----------

test('PIECE_VALUE has correct values for white pieces', () => {
  assert.equal(PIECE_VALUE[W_PAWN], 1);
  assert.equal(PIECE_VALUE[W_KNIGHT], 3);
  assert.equal(PIECE_VALUE[W_BISHOP], 3);
  assert.equal(PIECE_VALUE[W_ROOK], 5);
  assert.equal(PIECE_VALUE[W_QUEEN], 9);
  assert.equal(PIECE_VALUE[W_KING], 0);
});

test('PIECE_VALUE has correct values for black pieces', () => {
  assert.equal(PIECE_VALUE[B_PAWN], 1);
  assert.equal(PIECE_VALUE[B_KNIGHT], 3);
  assert.equal(PIECE_VALUE[B_BISHOP], 3);
  assert.equal(PIECE_VALUE[B_ROOK], 5);
  assert.equal(PIECE_VALUE[B_QUEEN], 9);
  assert.equal(PIECE_VALUE[B_KING], 0);
});

test('PIECE_VALUE is symmetric for same piece types', () => {
  assert.equal(PIECE_VALUE[W_PAWN], PIECE_VALUE[B_PAWN]);
  assert.equal(PIECE_VALUE[W_QUEEN], PIECE_VALUE[B_QUEEN]);
  assert.equal(PIECE_VALUE[W_ROOK], PIECE_VALUE[B_ROOK]);
});

// ---------- isWhite ----------

test('isWhite returns true for all white pieces', () => {
  assert.ok(isWhite(W_PAWN));
  assert.ok(isWhite(W_KNIGHT));
  assert.ok(isWhite(W_BISHOP));
  assert.ok(isWhite(W_ROOK));
  assert.ok(isWhite(W_QUEEN));
  assert.ok(isWhite(W_KING));
});

test('isWhite returns false for black pieces and EMPTY', () => {
  assert.ok(!isWhite(B_PAWN));
  assert.ok(!isWhite(B_KING));
  assert.ok(!isWhite(EMPTY));
});

// ---------- isBlack ----------

test('isBlack returns true for all black pieces', () => {
  assert.ok(isBlack(B_PAWN));
  assert.ok(isBlack(B_KNIGHT));
  assert.ok(isBlack(B_BISHOP));
  assert.ok(isBlack(B_ROOK));
  assert.ok(isBlack(B_QUEEN));
  assert.ok(isBlack(B_KING));
});

test('isBlack returns false for white pieces and EMPTY', () => {
  assert.ok(!isBlack(W_PAWN));
  assert.ok(!isBlack(W_KING));
  assert.ok(!isBlack(EMPTY));
});

// ---------- colorOf ----------

test('colorOf returns w for white pieces', () => {
  assert.equal(colorOf(W_PAWN), 'w');
  assert.equal(colorOf(W_KING), 'w');
});

test('colorOf returns b for black pieces', () => {
  assert.equal(colorOf(B_PAWN), 'b');
  assert.equal(colorOf(B_KING), 'b');
});

test('colorOf returns null for EMPTY', () => {
  assert.equal(colorOf(EMPTY), null);
});

// ---------- isFriendly ----------

test('isFriendly returns true for matching color', () => {
  assert.ok(isFriendly(W_PAWN, 'w'));
  assert.ok(isFriendly(B_PAWN, 'b'));
});

test('isFriendly returns false for opposing color', () => {
  assert.ok(!isFriendly(B_PAWN, 'w'));
  assert.ok(!isFriendly(W_PAWN, 'b'));
});

test('isFriendly returns false for EMPTY', () => {
  assert.ok(!isFriendly(EMPTY, 'w'));
  assert.ok(!isFriendly(EMPTY, 'b'));
});

// ---------- isEnemy ----------

test('isEnemy returns true for opposing color', () => {
  assert.ok(isEnemy(B_PAWN, 'w'));
  assert.ok(isEnemy(W_PAWN, 'b'));
});

test('isEnemy returns false for matching color', () => {
  assert.ok(!isEnemy(W_PAWN, 'w'));
  assert.ok(!isEnemy(B_PAWN, 'b'));
});

test('isEnemy returns false for EMPTY', () => {
  assert.ok(!isEnemy(EMPTY, 'w'));
  assert.ok(!isEnemy(EMPTY, 'b'));
});

// ---------- FILES and RANKS ----------

test('FILES has all 8 file letters', () => {
  assert.deepEqual(FILES, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
});

test('RANKS has all 8 rank numbers (8 to 1)', () => {
  assert.deepEqual(RANKS, ['8', '7', '6', '5', '4', '3', '2', '1']);
});

// ---------- rowColToFileRank ----------

test('rowColToFileRank converts a1 correctly', () => {
  assert.equal(rowColToFileRank(7, 0), 'a1');
});

test('rowColToFileRank converts h8 correctly', () => {
  assert.equal(rowColToFileRank(0, 7), 'h8');
});

test('rowColToFileRank converts e4 correctly', () => {
  assert.equal(rowColToFileRank(4, 4), 'e4');
});

test('rowColToFileRank converts d5 correctly', () => {
  assert.equal(rowColToFileRank(3, 3), 'd5');
});

// ---------- fileRankToRowCol ----------

test('fileRankToRowCol converts a1 correctly', () => {
  assert.deepEqual(fileRankToRowCol('a1'), { row: 7, col: 0 });
});

test('fileRankToRowCol converts h8 correctly', () => {
  assert.deepEqual(fileRankToRowCol('h8'), { row: 0, col: 7 });
});

test('fileRankToRowCol converts e4 correctly', () => {
  assert.deepEqual(fileRankToRowCol('e4'), { row: 4, col: 4 });
});

test('rowColToFileRank and fileRankToRowCol are inverses', () => {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = rowColToFileRank(r, c);
      const back = fileRankToRowCol(sq);
      assert.deepEqual(back, { row: r, col: c }, `roundtrip for (${r},${c}) = ${sq}`);
    }
  }
});

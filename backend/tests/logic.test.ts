import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEmptyBoard,
  initBoard,
  isSquareAttackedBy,
  findKing,
  isInCheck,
  pseudoLegalMoves,
  getLegalMoves,
  getAllLegalMoves,
  createInitialState,
  cloneState,
  applyMoveToBoard,
} from '../src/engine/logic.js';
import {
  EMPTY, W_PAWN, W_KNIGHT, W_BISHOP, W_ROOK, W_QUEEN, W_KING,
  B_PAWN, B_KNIGHT, B_BISHOP, B_ROOK, B_QUEEN, B_KING,
} from '../src/engine/types.js';

// ---------- createEmptyBoard ----------

test('createEmptyBoard returns 8x8 board of EMPTY', () => {
  const board = createEmptyBoard();
  assert.equal(board.length, 8);
  for (let r = 0; r < 8; r++) {
    assert.equal(board[r].length, 8);
    for (let c = 0; c < 8; c++) {
      assert.equal(board[r][c], EMPTY);
    }
  }
});

// ---------- initBoard ----------

test('initBoard places white back rank correctly', () => {
  const board = initBoard();
  assert.deepEqual(board[7], [W_ROOK, W_KNIGHT, W_BISHOP, W_QUEEN, W_KING, W_BISHOP, W_KNIGHT, W_ROOK]);
});

test('initBoard places black back rank correctly', () => {
  const board = initBoard();
  assert.deepEqual(board[0], [B_ROOK, B_KNIGHT, B_BISHOP, B_QUEEN, B_KING, B_BISHOP, B_KNIGHT, B_ROOK]);
});

test('initBoard places pawn rows correctly', () => {
  const board = initBoard();
  assert.ok(board[1].every(p => p === B_PAWN), 'all black pawns on row 1');
  assert.ok(board[6].every(p => p === W_PAWN), 'all white pawns on row 6');
});

test('initBoard has empty middle rows', () => {
  const board = initBoard();
  for (let r = 2; r <= 5; r++) {
    assert.ok(board[r].every(p => p === EMPTY), `row ${r} should be empty`);
  }
});

// ---------- findKing ----------

test('findKing finds white king on starting position', () => {
  const board = initBoard();
  assert.deepEqual(findKing(board, 'w'), { row: 7, col: 4 });
});

test('findKing finds black king on starting position', () => {
  const board = initBoard();
  assert.deepEqual(findKing(board, 'b'), { row: 0, col: 4 });
});

test('findKing returns null when king is missing', () => {
  const board = createEmptyBoard();
  assert.strictEqual(findKing(board, 'w'), null);
  assert.strictEqual(findKing(board, 'b'), null);
});

// ---------- isSquareAttackedBy ----------

test('isSquareAttackedBy detects white pawn attack', () => {
  const board = createEmptyBoard();
  board[5][3] = W_PAWN; // pawn on d3 attacks c4 and e4
  assert.ok(isSquareAttackedBy(board, 4, 2, 'w'), 'c4 should be attacked');
  assert.ok(isSquareAttackedBy(board, 4, 4, 'w'), 'e4 should be attacked');
  assert.ok(!isSquareAttackedBy(board, 4, 3, 'w'), 'd4 should NOT be attacked by pawn');
});

test('isSquareAttackedBy detects black pawn attack', () => {
  const board = createEmptyBoard();
  board[2][4] = B_PAWN; // black pawn on e5 attacks d4 and f4
  assert.ok(isSquareAttackedBy(board, 3, 3, 'b'), 'd4 should be attacked');
  assert.ok(isSquareAttackedBy(board, 3, 5, 'b'), 'f4 should be attacked');
});

test('isSquareAttackedBy detects knight attack', () => {
  const board = createEmptyBoard();
  board[4][4] = W_KNIGHT; // knight on e4
  assert.ok(isSquareAttackedBy(board, 2, 3, 'w'), 'c5 attacked by knight');
  assert.ok(isSquareAttackedBy(board, 2, 5, 'w'), 'e5 attacked by knight');
  assert.ok(isSquareAttackedBy(board, 3, 2, 'w'), 'd6 attacked by knight');
  assert.ok(isSquareAttackedBy(board, 5, 2, 'w'), 'd3 attacked by knight');
  assert.ok(isSquareAttackedBy(board, 6, 3, 'w'), 'c3 attacked by knight');
});

test('isSquareAttackedBy detects king attack', () => {
  const board = createEmptyBoard();
  board[4][4] = W_KING;
  assert.ok(isSquareAttackedBy(board, 3, 3, 'w'), 'd5 attacked');
  assert.ok(isSquareAttackedBy(board, 3, 4, 'w'), 'e5 attacked');
  assert.ok(isSquareAttackedBy(board, 4, 3, 'w'), 'd4 attacked');
  assert.ok(isSquareAttackedBy(board, 5, 5, 'w'), 'f3 attacked');
});

test('isSquareAttackedBy detects rook straight-line attack', () => {
  const board = createEmptyBoard();
  board[4][4] = W_ROOK;
  assert.ok(isSquareAttackedBy(board, 4, 0, 'w'), 'a4 attacked');
  assert.ok(isSquareAttackedBy(board, 0, 4, 'w'), 'e1 attacked');
  assert.ok(!isSquareAttackedBy(board, 3, 3, 'w'), 'd5 NOT attacked (diagonal)');
});

test('isSquareAttackedBy detects bishop diagonal attack', () => {
  const board = createEmptyBoard();
  board[4][4] = W_BISHOP;
  assert.ok(isSquareAttackedBy(board, 2, 2, 'w'), 'c7 attacked');
  assert.ok(isSquareAttackedBy(board, 7, 1, 'w'), 'b1 attacked');
  assert.ok(!isSquareAttackedBy(board, 4, 0, 'w'), 'a4 NOT attacked (straight)');
});

test('isSquareAttackedBy detects queen attack (straight + diagonal)', () => {
  const board = createEmptyBoard();
  board[4][4] = W_QUEEN;
  assert.ok(isSquareAttackedBy(board, 4, 0, 'w'), 'a4 attacked (straight)');
  assert.ok(isSquareAttackedBy(board, 2, 2, 'w'), 'c7 attacked (diagonal)');
});

test('isSquareAttackedBy stops at blocking piece', () => {
  const board = createEmptyBoard();
  board[4][4] = W_ROOK;
  board[4][5] = B_PAWN; // blocking piece
  assert.ok(!isSquareAttackedBy(board, 4, 7, 'w'), 'h4 should NOT be attacked (blocked)');
  assert.ok(isSquareAttackedBy(board, 4, 5, 'w'), 'f4 should be attacked (adjacent)');
});

// ---------- isInCheck ----------

test('isInCheck detects check from rook', () => {
  const board = createEmptyBoard();
  board[7][4] = W_KING; // white king on e1
  board[0][4] = B_ROOK; // black rook on e8 (same file, no blockers)
  assert.ok(isInCheck(board, 'w'), 'white king should be in check');
});

test('isInCheck detects check from bishop', () => {
  const board = createEmptyBoard();
  board[7][4] = W_KING; // e1
  board[5][2] = B_BISHOP; // c3, diagonal to e1 (delta row=2, delta col=2)
  assert.ok(isInCheck(board, 'w'), 'white king should be in check');
});

test('isInCheck detects no check when blocked', () => {
  const board = createEmptyBoard();
  board[7][4] = W_KING;
  board[0][4] = B_ROOK;
  board[4][4] = W_PAWN; // blocking piece
  assert.ok(!isInCheck(board, 'w'), 'white king should NOT be in check (blocked)');
});

test('isInCheck returns false for starting position', () => {
  const board = initBoard();
  assert.ok(!isInCheck(board, 'w'), 'white should not be in check');
  assert.ok(!isInCheck(board, 'b'), 'black should not be in check');
});

// ---------- pseudoLegalMoves ----------

test('pseudoLegalMoves returns empty array for empty square', () => {
  const board = createEmptyBoard();
  assert.deepEqual(pseudoLegalMoves(board, 0, 0), []);
});

test('pseudoLegalMoves returns pawn forward moves from starting position', () => {
  const board = initBoard();
  const moves = pseudoLegalMoves(board, 6, 4); // white pawn on e2
  assert.ok(moves.length >= 2, 'pawn should have at least 2 moves (e3, e4)');
});

test('pseudoLegalMoves returns knight moves', () => {
  const board = createEmptyBoard();
  board[4][4] = W_KNIGHT;
  const moves = pseudoLegalMoves(board, 4, 4);
  assert.equal(moves.length, 8, 'knight in center should have 8 moves');
});

test('pseudoLegalMoves returns king moves', () => {
  const board = createEmptyBoard();
  board[4][4] = W_KING;
  const moves = pseudoLegalMoves(board, 4, 4);
  assert.equal(moves.length, 8, 'king in center should have 8 moves');
});

test('pseudoLegalMoves knight on edge has fewer moves', () => {
  const board = createEmptyBoard();
  board[0][0] = W_KNIGHT;
  const moves = pseudoLegalMoves(board, 0, 0);
  assert.equal(moves.length, 2, 'knight on corner should have 2 moves');
});

// ---------- getLegalMoves (check-filtered) ----------

test('getLegalMoves returns empty for empty square', () => {
  const state = createInitialState();
  state.board = createEmptyBoard();
  assert.deepEqual(getLegalMoves(state, 0, 0), []);
});

test('getLegalMoves filters moves that leave king in check', () => {
  const state = createInitialState();
  state.board = createEmptyBoard();
  state.board[7][4] = W_KING;
  state.board[7][3] = W_PAWN;
  state.board[0][4] = B_ROOK; // black rook attacking e-file
  state.turn = 'w';

  // White pawn on d1 should NOT be able to move if it exposes king
  const moves = getLegalMoves(state, 7, 3);
  // The pawn has no forward move (row 8 is off board) and no captures
  assert.ok(moves.length === 0, 'pawn should have no legal moves');
});

test('getLegalMoves allows king to escape check', () => {
  const state = createInitialState();
  state.board = createEmptyBoard();
  state.board[7][4] = W_KING;
  state.board[7][7] = W_ROOK;
  state.board[0][4] = B_ROOK;
  state.turn = 'w';
  state.castlingRights = { wK: true, wQ: false, bK: false, bQ: false };

  const moves = getLegalMoves(state, 7, 4);
  assert.ok(moves.length > 0, 'king should have escape moves');
});

// ---------- getAllLegalMoves ----------

test('getAllLegalMoves returns moves for all pieces of a color', () => {
  const state = createInitialState();
  const whiteMoves = getAllLegalMoves(state, 'w');
  assert.ok(whiteMoves.length >= 20, 'white should have at least 20 legal moves');
});

test('getAllLegalMoves returns zero moves when king has no escape', () => {
  const state = createInitialState();
  state.board = createEmptyBoard();
  // Black king on a8, white rook on a1 checks, white king on c7 covers b8, b7
  state.board[0][0] = B_KING;  // black king on a8
  state.board[7][0] = W_ROOK;  // white rook on a1 (checks a-file)
  state.board[1][2] = W_KING;  // white king on c7 (attacks b8, b7, c8, d8, d7, d6, c6, b6)
  state.turn = 'b';

  const blackMoves = getAllLegalMoves(state, 'b');
  // King on a8: a7 attacked by rook, b8 and b7 attacked by white king on c7
  assert.equal(blackMoves.length, 0, 'black king should have no legal moves');
});

// ---------- cloneState ----------

test('cloneState creates independent copy', () => {
  const state = createInitialState();
  const cloned = cloneState(state);

  assert.ok(cloned.board !== state.board, 'board should be a new array');
  assert.ok(cloned.board[0] !== state.board[0], 'board rows should be independent');

  cloned.board[0][0] = EMPTY;
  assert.notEqual(state.board[0][0], EMPTY, 'modifying clone should not affect original');
});

// ---------- applyMoveToBoard ----------

test('applyMoveToBoard moves a piece', () => {
  const board = createEmptyBoard();
  board[6][4] = W_PAWN;
  const move = { from: { row: 6, col: 4 }, to: { row: 4, col: 4 } };
  applyMoveToBoard(board, move);
  assert.equal(board[4][4], W_PAWN);
  assert.equal(board[6][4], EMPTY);
});

test('applyMoveToBoard captures a piece', () => {
  const board = createEmptyBoard();
  board[6][4] = W_PAWN;
  board[5][5] = B_PAWN;
  const move = { from: { row: 6, col: 4 }, to: { row: 5, col: 5 } };
  const captured = applyMoveToBoard(board, move);
  assert.equal(captured, B_PAWN);
  assert.equal(board[5][5], W_PAWN);
  assert.equal(board[6][4], EMPTY);
});

test('applyMoveToBoard handles kingside castling', () => {
  const board = createEmptyBoard();
  board[7][4] = W_KING;
  board[7][7] = W_ROOK;
  const move = { from: { row: 7, col: 4 }, to: { row: 7, col: 6 }, castle: 'K' };
  applyMoveToBoard(board, move);
  assert.equal(board[7][6], W_KING);
  assert.equal(board[7][5], W_ROOK);
  assert.equal(board[7][4], EMPTY);
  assert.equal(board[7][7], EMPTY);
});

test('applyMoveToBoard handles queenside castling', () => {
  const board = createEmptyBoard();
  board[7][4] = W_KING;
  board[7][0] = W_ROOK;
  const move = { from: { row: 7, col: 4 }, to: { row: 7, col: 2 }, castle: 'Q' };
  applyMoveToBoard(board, move);
  assert.equal(board[7][2], W_KING);
  assert.equal(board[7][3], W_ROOK);
  assert.equal(board[7][4], EMPTY);
  assert.equal(board[7][0], EMPTY);
});

test('applyMoveToBoard handles pawn promotion to queen', () => {
  const board = createEmptyBoard();
  board[1][4] = W_PAWN;
  const move = { from: { row: 1, col: 4 }, to: { row: 0, col: 4 }, promotion: 'q' };
  applyMoveToBoard(board, move);
  assert.equal(board[0][4], W_QUEEN);
  assert.equal(board[1][4], EMPTY);
});

test('applyMoveToBoard handles en passant capture', () => {
  const board = createEmptyBoard();
  board[3][4] = W_PAWN;  // white pawn on e5
  board[3][5] = B_PAWN;  // black pawn on f5 (just moved f7-f5)
  const move = { from: { row: 3, col: 4 }, to: { row: 2, col: 5 }, enPassant: true };
  const captured = applyMoveToBoard(board, move);
  assert.equal(captured, B_PAWN);
  assert.equal(board[2][5], W_PAWN);
  assert.equal(board[3][5], EMPTY);
  assert.equal(board[3][4], EMPTY);
});

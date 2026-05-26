import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEmptyBoard,
  createInitialState,
  pseudoLegalMoves,
  getLegalMoves,
  applyMoveToBoard,
} from '../src/engine/logic.js';
import {
  EMPTY, W_PAWN, W_QUEEN, W_KNIGHT, W_BISHOP, W_ROOK, W_KING,
  B_PAWN, B_QUEEN, B_KING, B_ROOK,
} from '../src/engine/types.js';

// ---------- Pawn Promotion ----------

test('pseudoLegalMoves generates promotion move for white pawn reaching rank 8', () => {
  const board = createEmptyBoard();
  board[1][4] = W_PAWN; // white pawn on e7
  const moves = pseudoLegalMoves(board, 1, 4);
  const promoMove = moves.find(m => m.to.row === 0 && m.promotion);
  assert.ok(promoMove, 'should have a promotion move');
  assert.equal(promoMove?.promotion, 'q', 'should promote to queen by default');
});

test('pseudoLegalMoves generates promotion move for black pawn reaching rank 1', () => {
  const board = createEmptyBoard();
  board[6][4] = B_PAWN; // black pawn on e2
  const moves = pseudoLegalMoves(board, 6, 4);
  const promoMove = moves.find(m => m.to.row === 7 && m.promotion);
  assert.ok(promoMove, 'should have a promotion move');
  assert.equal(promoMove?.promotion, 'q', 'should promote to queen by default');
});

test('pseudoLegalMoves generates promotion capture for white pawn', () => {
  const board = createEmptyBoard();
  board[1][4] = W_PAWN; // white pawn on e7
  board[0][5] = B_KING; // black king on f8
  const moves = pseudoLegalMoves(board, 1, 4);
  const promoCapture = moves.find(m => m.to.row === 0 && m.to.col === 5 && m.promotion);
  assert.ok(promoCapture, 'should have a promotion capture move');
  assert.equal(promoCapture?.promotion, 'q');
});

test('applyMoveToBoard promotes white pawn to queen', () => {
  const board = createEmptyBoard();
  board[1][4] = W_PAWN;
  applyMoveToBoard(board, { from: { row: 1, col: 4 }, to: { row: 0, col: 4 }, promotion: 'q' });
  assert.equal(board[0][4], W_QUEEN);
  assert.equal(board[1][4], EMPTY);
});

test('applyMoveToBoard promotes black pawn to queen', () => {
  const board = createEmptyBoard();
  board[6][4] = B_PAWN;
  applyMoveToBoard(board, { from: { row: 6, col: 4 }, to: { row: 7, col: 4 }, promotion: 'q' });
  assert.equal(board[7][4], B_QUEEN);
  assert.equal(board[6][4], EMPTY);
});

test('getLegalMoves includes promotion move when it is legal', () => {
  const state = createInitialState();
  state.board = createEmptyBoard();
  state.board[1][4] = W_PAWN; // white pawn on e7
  state.board[7][4] = W_KING; // white king on e1 (safe)
  state.turn = 'w';

  const moves = getLegalMoves(state, 1, 4);
  const promoMove = moves.find(m => m.promotion);
  assert.ok(promoMove, 'promotion should be a legal move');
});

// ---------- En Passant ----------

test('getLegalMoves generates en passant capture for white pawn', () => {
  const state = createInitialState();
  state.board = createEmptyBoard();
  state.board[3][4] = W_PAWN; // white pawn on e5
  state.board[4][5] = B_PAWN; // black pawn on f4 (just moved f7-f5, captured ep takes it here)
  state.board[7][4] = W_KING; // white king (safe)
  state.enPassantTarget = { row: 2, col: 5 }; // f4: where white pawn lands for ep
  state.turn = 'w';

  const moves = getLegalMoves(state, 3, 4);
  const epMove = moves.find(m => m.enPassant);
  assert.ok(epMove, 'should have en passant capture');
  assert.deepEqual(epMove?.to, { row: 2, col: 5 }, 'en passant target should be f4');
});

test('getLegalMoves generates en passant capture for black pawn', () => {
  const state = createInitialState();
  state.board = createEmptyBoard();
  state.board[4][4] = B_PAWN; // black pawn on e4
  state.board[4][3] = W_PAWN; // white pawn on d4 (the one that just moved d2-d4)
  state.board[0][4] = B_KING; // black king (safe)
  state.enPassantTarget = { row: 5, col: 3 }; // d5: where black pawn lands for ep
  state.turn = 'b';

  const moves = getLegalMoves(state, 4, 4);
  const epMove = moves.find(m => m.enPassant);
  assert.ok(epMove, 'should have en passant capture for black');
  assert.deepEqual(epMove?.to, { row: 5, col: 3 }, 'en passant target should be d5');
});

test('applyMoveToBoard executes en passant capture correctly', () => {
  const board = createEmptyBoard();
  board[3][4] = W_PAWN; // white pawn on e5
  board[3][5] = B_PAWN; // black pawn on f5
  applyMoveToBoard(board, {
    from: { row: 3, col: 4 },
    to: { row: 2, col: 5 },
    enPassant: true,
  });
  assert.equal(board[2][5], W_PAWN, 'white pawn should be on f4');
  assert.equal(board[3][5], EMPTY, 'black pawn on f5 should be captured');
  assert.equal(board[3][4], EMPTY, 'white pawn should leave e5');
});

test('en passant is not available when target is not set', () => {
  const state = createInitialState();
  state.board = createEmptyBoard();
  state.board[3][4] = W_PAWN;
  state.board[3][5] = B_PAWN;
  state.board[7][4] = W_KING;
  state.enPassantTarget = null; // no en passant target
  state.turn = 'w';

  const moves = getLegalMoves(state, 3, 4);
  const epMove = moves.find(m => m.enPassant);
  assert.equal(epMove, undefined, 'no en passant when target is null');
});

test('en passant is filtered out if it leaves king in check', () => {
  const state = createInitialState();
  state.board = createEmptyBoard();
  state.board[3][4] = W_PAWN;  // white pawn on e5
  state.board[3][5] = B_PAWN;  // black pawn on f5
  state.board[3][3] = W_KING;  // white king on d5 (exposed)
  state.board[1][5] = B_ROOK;  // black rook on f3 (would check king after ep)
  state.enPassantTarget = { row: 3, col: 5 };
  state.turn = 'w';

  const moves = getLegalMoves(state, 3, 4);
  const epMove = moves.find(m => m.enPassant);
  // The en passant to f4 would expose king to rook on f-file
  assert.equal(epMove, undefined, 'en passant should be filtered if it exposes king');
});

// ---------- Combined: promotion + en passant not both on same move ----------

test('pawn cannot promote and capture en passant in the same move', () => {
  const state = createInitialState();
  state.board = createEmptyBoard();
  state.board[1][4] = W_PAWN; // white pawn on e7
  state.board[0][5] = B_PAWN; // black pawn on f8 (can't really be here, but testing)
  state.board[7][4] = W_KING;
  state.enPassantTarget = { row: 0, col: 5 }; // f8 - unrealistic but testing the logic
  state.turn = 'w';

  const moves = getLegalMoves(state, 1, 4);
  // The engine should generate either promotion OR en passant, not both
  const both = moves.find(m => m.promotion && m.enPassant);
  assert.equal(both, undefined, 'no move should have both promotion and en passant');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  B_KING,
  B_ROOK,
  EMPTY,
  PIECE_TYPE,
  W_KING,
  W_ROOK,
  applyMoveToBoard,
  createInitialState,
  generateFEN,
  getLegalMoves,
} from '../src/engine/index.js';
import type { ChessMove, GameContext } from '../src/engine/index.js';

function playLegalUci(state: GameContext, uci: string): ChessMove {
  const from = {
    row: 8 - Number.parseInt(uci[1], 10),
    col: uci.charCodeAt(0) - 97,
  };
  const to = {
    row: 8 - Number.parseInt(uci[3], 10),
    col: uci.charCodeAt(2) - 97,
  };
  const promotion = uci.length >= 5 ? uci[4] : undefined;
  const sourcePiece = state.board[from.row][from.col];
  const move = getLegalMoves(state, from.row, from.col).find((candidate) =>
    candidate.to.row === to.row &&
    candidate.to.col === to.col &&
    candidate.promotion === promotion
  );

  assert.ok(move, `${uci} should be legal`);
  const capturedPiece = applyMoveToBoard(state.board, move);

  if (sourcePiece === W_KING) { state.castlingRights.wK = false; state.castlingRights.wQ = false; }
  if (sourcePiece === B_KING) { state.castlingRights.bK = false; state.castlingRights.bQ = false; }
  if (sourcePiece === W_ROOK && from.row === 7 && from.col === 0) state.castlingRights.wQ = false;
  if (sourcePiece === W_ROOK && from.row === 7 && from.col === 7) state.castlingRights.wK = false;
  if (sourcePiece === B_ROOK && from.row === 0 && from.col === 0) state.castlingRights.bQ = false;
  if (sourcePiece === B_ROOK && from.row === 0 && from.col === 7) state.castlingRights.bK = false;
  if (to.row === 7 && to.col === 0) state.castlingRights.wQ = false;
  if (to.row === 7 && to.col === 7) state.castlingRights.wK = false;
  if (to.row === 0 && to.col === 0) state.castlingRights.bQ = false;
  if (to.row === 0 && to.col === 7) state.castlingRights.bK = false;

  state.enPassantTarget = null;
  if (PIECE_TYPE[sourcePiece] === 'p' && Math.abs(to.row - from.row) === 2) {
    state.enPassantTarget = { row: (from.row + to.row) / 2, col: from.col };
  }

  state.halfmoveClock = PIECE_TYPE[sourcePiece] === 'p' || capturedPiece !== 0
    ? 0
    : state.halfmoveClock + 1;
  if (state.turn === 'b') state.fullmoveNumber++;
  state.turn = state.turn === 'w' ? 'b' : 'w';
  state.lastMove = move;

  return move;
}

test('backend engine allows white kingside castling in a legal game sequence', () => {
  const state = createInitialState();

  for (const uci of ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6']) {
    playLegalUci(state, uci);
  }

  assert.ok(getLegalMoves(state, 7, 4).some((move) =>
    move.to.row === 7 &&
    move.to.col === 6 &&
    move.castle === 'K'
  ));

  playLegalUci(state, 'e1g1');

  assert.equal(state.board[7][6], W_KING);
  assert.equal(state.board[7][5], W_ROOK);
  assert.equal(state.board[7][4], EMPTY);
  assert.equal(state.board[7][7], EMPTY);
  assert.equal(state.castlingRights.wK, false);
  assert.equal(state.castlingRights.wQ, false);
  assert.equal(generateFEN(state.board, state.turn, state.castlingRights, state.enPassantTarget, state.halfmoveClock, state.fullmoveNumber), 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4');
});

test('backend engine allows black kingside castling in a legal game sequence', () => {
  const state = createInitialState();

  for (const uci of ['e2e4', 'e7e5', 'g1f3', 'g8f6', 'b1c3', 'f8c5', 'd2d3']) {
    playLegalUci(state, uci);
  }

  assert.deepEqual(
    getLegalMoves(state, 0, 4).find((move) => move.to.row === 0 && move.to.col === 6),
    { from: { row: 0, col: 4 }, to: { row: 0, col: 6 }, castle: 'K' },
  );

  playLegalUci(state, 'e8g8');

  assert.equal(state.board[0][6], B_KING);
  assert.equal(state.board[0][5], B_ROOK);
  assert.equal(state.board[0][4], EMPTY);
  assert.equal(state.board[0][7], EMPTY);
  assert.equal(state.castlingRights.bK, false);
  assert.equal(state.castlingRights.bQ, false);
  assert.equal(generateFEN(state.board, state.turn, state.castlingRights, state.enPassantTarget, state.halfmoveClock, state.fullmoveNumber), 'rnbq1rk1/pppp1ppp/5n2/2b1p3/4P3/2NP1N2/PPP2PPP/R1BQKB1R w KQ - 1 5');
});

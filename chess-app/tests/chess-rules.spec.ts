import { expect, test } from '@playwright/test';
import {
  B_KING,
  B_PAWN,
  B_ROOK,
  EMPTY,
  PIECE_TYPE,
  W_KING,
  W_PAWN,
  W_ROOK,
  colorOf,
} from '../src/engine/types';
import type { ChessMove } from '../src/engine/types';
import { applyMoveToBoard, createEmptyBoard, createInitialState, getLegalMoves } from '../src/engine/logic';
import type { GameContext } from '../src/engine/logic';
import { generateFEN } from '../src/engine/notation';

function playLegalUci(state: GameContext, uci: string): ChessMove {
  const from = {
    row: 8 - Number.parseInt(uci[1], 10),
    col: uci.charCodeAt(0) - 97,
  };
  const to = {
    row: 8 - Number.parseInt(uci[3], 10),
    col: uci.charCodeAt(2) - 97,
  };
  const sourcePiece = state.board[from.row][from.col];
  const promotion = uci.length >= 5 ? uci[4] : undefined;
  const move = getLegalMoves(state, from.row, from.col).find((candidate) =>
    candidate.to.row === to.row &&
    candidate.to.col === to.col &&
    candidate.promotion === promotion
  );

  expect(move, `${uci} should be legal`).toBeDefined();
  const capturedPiece = applyMoveToBoard(state.board, move!);

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
  state.lastMove = move!;

  return move!;
}

test('king cannot castle from a non-starting square even when castling rights are stale', () => {
  const state = createInitialState();
  state.board = createEmptyBoard();
  state.board[6][4] = W_KING;
  state.board[7][7] = W_ROOK;
  state.board[0][4] = B_KING;
  state.castlingRights = { wK: true, wQ: true, bK: false, bQ: false };

  const moves = getLegalMoves(state, 6, 4);

  expect(moves).not.toContainEqual({
    from: { row: 6, col: 4 },
    to: { row: 7, col: 6 },
    castle: 'K',
  });
  expect(moves.every((move) => Math.abs(move.to.row - 6) <= 1 && Math.abs(move.to.col - 4) <= 1)).toBe(true);
});

test('king can castle only from the starting square with the matching rook present', () => {
  const state = createInitialState();
  state.board = createEmptyBoard();
  state.board[7][4] = W_KING;
  state.board[7][7] = W_ROOK;
  state.board[0][4] = B_KING;
  state.castlingRights = { wK: true, wQ: false, bK: false, bQ: false };

  expect(getLegalMoves(state, 7, 4)).toContainEqual({
    from: { row: 7, col: 4 },
    to: { row: 7, col: 6 },
    castle: 'K',
  });

  state.board[7][7] = EMPTY;

  expect(getLegalMoves(state, 7, 4)).not.toContainEqual({
    from: { row: 7, col: 4 },
    to: { row: 7, col: 6 },
    castle: 'K',
  });
});

test('pawn can capture en passant and removes the passed pawn', () => {
  const state = createInitialState();
  state.board = createEmptyBoard();
  state.board[7][4] = W_KING;
  state.board[0][4] = B_KING;
  state.board[3][4] = W_PAWN;
  state.board[3][3] = B_PAWN;
  state.turn = 'w';
  state.enPassantTarget = { row: 2, col: 3 };

  const moves = getLegalMoves(state, 3, 4);
  const enPassant = moves.find((move) =>
    move.to.row === 2 &&
    move.to.col === 3 &&
    move.enPassant === true
  );

  expect(enPassant).toBeDefined();

  applyMoveToBoard(state.board, enPassant!);

  expect(state.board[2][3]).toBe(W_PAWN);
  expect(state.board[3][3]).toBe(EMPTY);
  expect(state.board[3][4]).toBe(EMPTY);
});

test('white can castle kingside during a legal opening sequence', () => {
  const state = createInitialState();

  for (const uci of ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6']) {
    playLegalUci(state, uci);
  }

  const castle = getLegalMoves(state, 7, 4).find((move) =>
    move.to.row === 7 &&
    move.to.col === 6 &&
    move.castle === 'K'
  );

  expect(castle).toBeDefined();
  expect(colorOf(state.board[7][4])).toBe('w');

  playLegalUci(state, 'e1g1');

  expect(state.board[7][6]).toBe(W_KING);
  expect(state.board[7][5]).toBe(W_ROOK);
  expect(state.board[7][4]).toBe(EMPTY);
  expect(state.board[7][7]).toBe(EMPTY);
  expect(state.castlingRights.wK).toBe(false);
  expect(state.castlingRights.wQ).toBe(false);
  expect(generateFEN(state)).toBe('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4');
});

test('black can castle kingside during a legal opening sequence', () => {
  const state = createInitialState();

  for (const uci of ['e2e4', 'e7e5', 'g1f3', 'g8f6', 'b1c3', 'f8c5', 'd2d3']) {
    playLegalUci(state, uci);
  }

  expect(getLegalMoves(state, 0, 4)).toContainEqual({
    from: { row: 0, col: 4 },
    to: { row: 0, col: 6 },
    castle: 'K',
  });

  playLegalUci(state, 'e8g8');

  expect(state.board[0][6]).toBe(B_KING);
  expect(state.board[0][5]).toBe(B_ROOK);
  expect(state.board[0][4]).toBe(EMPTY);
  expect(state.board[0][7]).toBe(EMPTY);
  expect(state.castlingRights.bK).toBe(false);
  expect(state.castlingRights.bQ).toBe(false);
  expect(generateFEN(state)).toBe('rnbq1rk1/pppp1ppp/5n2/2b1p3/4P3/2NP1N2/PPP2PPP/R1BQKB1R w KQ - 1 5');
});

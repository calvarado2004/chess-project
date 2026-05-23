import { expect, test } from '@playwright/test';
import { B_KING, B_PAWN, EMPTY, W_KING, W_PAWN, W_ROOK } from '../src/engine/types';
import { applyMoveToBoard, createEmptyBoard, createInitialState, getLegalMoves } from '../src/engine/logic';

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

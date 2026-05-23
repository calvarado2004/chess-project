import { expect, test } from '@playwright/test';
import { B_KING, EMPTY, W_KING, W_ROOK } from '../src/engine/types';
import { createEmptyBoard, createInitialState, getLegalMoves } from '../src/engine/logic';

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

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createInitialState, getAllLegalMoves, applyMoveToBoard,
  EMPTY, W_PAWN, W_KING, B_ROOK, B_KING, W_QUEEN, B_QUEEN,
} from '../src/engine/index.js';

const empty = () => Array.from({ length: 8 }, () => Array(8).fill(EMPTY));
const isKing = (p: number) => p === W_KING || p === B_KING;

test('a king is never offered as a capture target', () => {
  // White Kg1 boxed in by pawns, Black Ra1 attacking along the first rank,
  // Black Ka8. The black rook "could" capture the white king on g1.
  const s = createInitialState();
  s.board = empty();
  s.board[7][6] = W_KING;
  s.board[6][5] = W_PAWN; s.board[6][6] = W_PAWN; s.board[6][7] = W_PAWN;
  s.board[7][0] = B_ROOK;
  s.board[0][0] = B_KING;
  s.castlingRights = { wK: false, wQ: false, bK: false, bQ: false };
  s.enPassantTarget = null;

  const blackMoves = getAllLegalMoves(s, 'b');
  const kingCaptures = blackMoves.filter((m) => isKing(s.board[m.to.row][m.to.col]));
  assert.equal(kingCaptures.length, 0, 'no legal move may capture a king');
});

test('arbitrary (lesson-style) position never allows capturing the enemy king', () => {
  // White queen on d1, enemy king directly in front on d8 with an open file.
  const s = createInitialState();
  s.board = empty();
  s.board[7][3] = W_QUEEN; // d1
  s.board[7][4] = W_KING;  // e1
  s.board[0][3] = B_KING;  // d8 — on the same open file as the queen
  s.board[0][7] = B_QUEEN; // h8
  s.castlingRights = { wK: false, wQ: false, bK: false, bQ: false };
  s.enPassantTarget = null;

  const whiteMoves = getAllLegalMoves(s, 'w');
  const kingCaptures = whiteMoves.filter((m) => isKing(s.board[m.to.row][m.to.col]));
  assert.equal(kingCaptures.length, 0, 'queen must not be allowed to capture the king on d8');
});

test('legal play never produces a position where a king sits en prise', () => {
  // Play many random legal games; after every move the side that just moved
  // must not be capturable, i.e. no king-capture is ever generated.
  let kingCapturesSeen = 0;
  for (let g = 0; g < 100; g++) {
    const s = createInitialState();
    let turn: 'w' | 'b' = 'w';
    for (let ply = 0; ply < 80; ply++) {
      const moves = getAllLegalMoves(s, turn);
      for (const m of moves) if (isKing(s.board[m.to.row][m.to.col])) kingCapturesSeen++;
      if (moves.length === 0) break;
      applyMoveToBoard(s.board, moves[(g * 7 + ply * 13) % moves.length]);
      turn = turn === 'w' ? 'b' : 'w';
    }
  }
  assert.equal(kingCapturesSeen, 0, 'king-capture must never be generated during legal play');
});

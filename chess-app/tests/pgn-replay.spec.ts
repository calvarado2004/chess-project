import { expect, test } from '@playwright/test';
import { EMPTY, W_KING, W_PAWN, W_ROOK } from '../src/engine/types';
import { parsePGN, replayMovesFromPGN } from '../src/engine/pgn';

test('PGN parser strips metadata annotations and replays castling through legal SAN', () => {
  const pgn = `
[Event "Castle Regression"]
[Site "Local"]
[Result "*"]

1. e4 {opens the bishop} e5 $1 (1... c5) 2. Nf3 Nc6 3. Bb5 a6 4. O-O *
`;

  const parsed = parsePGN(pgn);

  expect(parsed.headers.Event).toBe('Castle Regression');
  expect(parsed.result).toBe('*');
  expect(parsed.moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'O-O']);

  const replay = replayMovesFromPGN(parsed.moves);

  expect(replay.moveHistory).toEqual(parsed.moves);
  expect(replay.board[7][6]).toBe(W_KING);
  expect(replay.board[7][5]).toBe(W_ROOK);
  expect(replay.board[7][4]).toBe(EMPTY);
  expect(replay.board[7][7]).toBe(EMPTY);
  expect(replay.castlingRights.wK).toBe(false);
  expect(replay.castlingRights.wQ).toBe(false);
  expect(replay.castlingRights.bK).toBe(true);
  expect(replay.castlingRights.bQ).toBe(true);
});

test('PGN replay preserves en passant context across legal SAN moves', () => {
  const parsed = parsePGN(`
[Event "En Passant Regression"]
[Result "*"]

1. e4 h5 2. e5 d5 3. exd6 *
`);

  expect(parsed.moves).toEqual(['e4', 'h5', 'e5', 'd5', 'exd6']);

  const replay = replayMovesFromPGN(parsed.moves);

  expect(replay.moveHistory).toEqual(parsed.moves);
  expect(replay.board[2][3]).toBe(W_PAWN);
  expect(replay.board[3][3]).toBe(EMPTY);
  expect(replay.board[3][4]).toBe(EMPTY);
  expect(replay.enPassantTarget).toBeNull();
  expect(replay.turn).toBe('b');
});

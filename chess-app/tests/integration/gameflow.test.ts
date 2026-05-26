import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  createEmptyBoard,
  getLegalMoves,
  getAllLegalMoves,
  applyMoveToBoard,
  isInCheck,
} from '../../src/engine/logic';
import { generateFEN } from '../../src/engine/notation';
import {
  EMPTY, W_KING, W_ROOK, W_PAWN, W_KNIGHT, W_BISHOP, W_QUEEN,
  B_KING, B_PAWN, B_KNIGHT, B_BISHOP, B_ROOK, B_QUEEN,
  PIECE_TYPE, colorOf,
} from '../../src/engine/types';
import type { ChessMove, CastlingRights, Coord } from '../../src/engine/types';
import type { GameContext } from '../../src/engine/logic';

/**
 * Helper: play a UCI move (e.g., "e2e4") on the game state.
 * Updates turn, castling rights, en passant target, halfmove clock, fullmove number.
 */
function playUci(state: GameContext, uci: string): ChessMove {
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

  expect(move, `${uci} should be legal`).toBeDefined();
  const capturedVal = applyMoveToBoard(state.board, move!);

  // Update castling rights
  if (sourcePiece === W_KING) { state.castlingRights.wK = false; state.castlingRights.wQ = false; }
  if (sourcePiece === B_KING) { state.castlingRights.bK = false; state.castlingRights.bQ = false; }
  if (sourcePiece === W_ROOK && from.row === 7 && from.col === 0) state.castlingRights.wQ = false;
  if (sourcePiece === W_ROOK && from.row === 7 && from.col === 7) state.castlingRights.wK = false;
  if (sourcePiece === B_ROOK && from.row === 0 && from.col === 0) state.castlingRights.bQ = false;
  if (sourcePiece === B_ROOK && from.row === 0 && from.col === 7) state.castlingRights.bK = false;
  // Rook capture on starting square
  if (to.row === 7 && to.col === 0) state.castlingRights.wQ = false;
  if (to.row === 7 && to.col === 7) state.castlingRights.wK = false;
  if (to.row === 0 && to.col === 0) state.castlingRights.bQ = false;
  if (to.row === 0 && to.col === 7) state.castlingRights.bK = false;

  // En passant target
  state.enPassantTarget = null;
  if (PIECE_TYPE[sourcePiece] === 'p' && Math.abs(to.row - from.row) === 2) {
    state.enPassantTarget = { row: (from.row + to.row) / 2, col: from.col };
  }

  // Clocks
  state.halfmoveClock = PIECE_TYPE[sourcePiece] === 'p' || capturedVal !== 0 ? 0 : state.halfmoveClock + 1;
  if (state.turn === 'b') state.fullmoveNumber++;
  state.turn = state.turn === 'w' ? 'b' : 'w';
  state.lastMove = move!;

  return move!;
}

describe('Full game flow - Italian Game', () => {
  it('should play through 10 moves of the Italian Game', () => {
    const state = createInitialState();

    const moves = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'b1c3', 'g8f6', 'e1g1', 'e8g8'];

    for (const uci of moves) {
      playUci(state, uci);
    }

    // Verify final state
    const fen = generateFEN(state);
    expect(state.turn).toBe('w'); // after 10 moves (5 each), white to move
    expect(state.castlingRights.wK).toBe(false); // white castled
    expect(state.castlingRights.wQ).toBe(false);
    expect(state.castlingRights.bK).toBe(false); // black castled
    expect(state.castlingRights.bQ).toBe(false);
    // Verify kings are on g1/g8
    expect(state.board[7][6]).toBe(W_KING);
    expect(state.board[0][6]).toBe(B_KING);
  });

  it('should detect check during game', () => {
    const state = createInitialState();

    // 1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# (Scholar's Mate gives check)
    playUci(state, 'e2e4');
    playUci(state, 'e7e5');
    playUci(state, 'd1h5');
    playUci(state, 'b8c6');
    playUci(state, 'f1c4');
    playUci(state, 'g8f6');
    playUci(state, 'h5f7');

    // Verify queen is on f7
    expect(state.board[1][5]).toBe(W_QUEEN);
    // Black king should be in checkmate (check + no legal moves)
    expect(isInCheck(state.board, 'b')).toBe(true);
    const blackMoves = getAllLegalMoves(state, 'b');
    expect(blackMoves).toHaveLength(0);
  });
});

describe('Full game flow - Scholar\'s Mate', () => {
  it('should reach checkmate in 4 moves', () => {
    const state = createInitialState();

    // 1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#
    playUci(state, 'e2e4');
    playUci(state, 'e7e5');
    playUci(state, 'd1h5');
    playUci(state, 'b8c6');
    playUci(state, 'f1c4');
    playUci(state, 'g8f6');
    playUci(state, 'h5f7');

    // Black should be in checkmate
    expect(isInCheck(state.board, 'b')).toBe(true);
    const blackMoves = getAllLegalMoves(state, 'b');
    expect(blackMoves).toHaveLength(0);
  });
});

describe('Full game flow - Fool\'s Mate', () => {
  it('should reach checkmate in 2 moves', () => {
    const state = createInitialState();

    // 1. f3 e5 2. g4 Qh4#
    playUci(state, 'f2f3');
    playUci(state, 'e7e5');
    playUci(state, 'g2g4');
    playUci(state, 'd8h4');

    // White should be in checkmate
    expect(isInCheck(state.board, 'w')).toBe(true);
    const whiteMoves = getAllLegalMoves(state, 'w');
    expect(whiteMoves).toHaveLength(0);
  });
});

describe('FEN round-trip', () => {
  it('should generate correct FEN after multiple moves', () => {
    const state = createInitialState();

    playUci(state, 'e2e4');
    expect(generateFEN(state)).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');

    playUci(state, 'e7e5');
    expect(generateFEN(state)).toBe('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2');

    playUci(state, 'g1f3');
    expect(generateFEN(state)).toBe('rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2');
  });
});

describe('Complex game scenarios', () => {
  it('should handle en passant in a real game', () => {
    const state = createInitialState();

    playUci(state, 'e2e4');
    playUci(state, 'c7c5');
    playUci(state, 'e4e5');
    playUci(state, 'd7d5');

    // En passant target is d6 (row 2, col 3) - the square the pawn passed over
    expect(state.enPassantTarget).toEqual({ row: 2, col: 3 });

    // White pawn on e5 can capture en passant to d6
    const epMoves = getLegalMoves(state, 3, 4); // pawn on e5
    const epMove = epMoves.find(m => m.enPassant);
    expect(epMove).toBeDefined();
    expect(epMove!.to).toEqual({ row: 2, col: 3 }); // d6

    playUci(state, 'e5d6');

    // Verify: white pawn on d6, black pawn on d5 removed
    expect(state.board[2][3]).toBe(W_PAWN);
    expect(state.board[3][3]).toBe(EMPTY);
  });

  it('should handle pawn promotion', () => {
    const state = createInitialState();
    state.board = createEmptyBoard();
    state.board[0] = [B_KING, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]; // black king on a8
    state.board[1] = [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY];
    state.board[6] = [EMPTY, EMPTY, EMPTY, EMPTY, W_KING, EMPTY, EMPTY, EMPTY];
    state.board[7] = [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY];
    state.board[1][4] = W_PAWN; // pawn on e7
    state.turn = 'w';
    state.castlingRights = { wK: false, wQ: false, bK: false, bQ: false };

    const moves = getLegalMoves(state, 1, 4);
    const promo = moves.find(m => m.promotion === 'q');
    expect(promo).toBeDefined();

    applyMoveToBoard(state.board, promo!);
    expect(state.board[0][4]).toBe(W_QUEEN);
  });

  it('should lose castling rights when king moves', () => {
    const state = createInitialState();

    playUci(state, 'e2e4');
    playUci(state, 'e7e5');
    playUci(state, 'g1f3'); // develop knight, clears g1 for castling
    playUci(state, 'b8c6');
    playUci(state, 'f1c4'); // develop bishop, clears f1 for castling
    playUci(state, 'd7d6'); // black responds
    playUci(state, 'e1g1'); // castle kingside

    expect(state.castlingRights.wK).toBe(false);
    expect(state.castlingRights.wQ).toBe(false);
    expect(state.board[7][6]).toBe(W_KING); // king on g1
    expect(state.board[7][5]).toBe(W_ROOK); // rook on f1
  });

  it('should verify FEN after castling', () => {
    const state = createInitialState();

    playUci(state, 'e2e4');
    playUci(state, 'e7e5');
    playUci(state, 'g1f3');
    playUci(state, 'b8c6');
    playUci(state, 'f1b5');
    playUci(state, 'a7a6');

    const fen = generateFEN(state);
    expect(fen).toContain('KQkq'); // all castling rights still available
  });

  it('should generate correct FEN after white castles', () => {
    const state = createInitialState();

    playUci(state, 'e2e4');
    playUci(state, 'e7e5');
    playUci(state, 'g1f3');
    playUci(state, 'b8c6');
    playUci(state, 'f1c4');
    playUci(state, 'f8c5');
    playUci(state, 'b1c3');
    playUci(state, 'g8f6');
    playUci(state, 'e1g1'); // O-O

    const fen = generateFEN(state);
    expect(fen).toContain('R1BQ1RK1'); // rook on f1, king on g1
    expect(state.castlingRights.wK).toBe(false);
    expect(state.castlingRights.wQ).toBe(false);
  });
});

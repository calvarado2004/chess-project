import { describe, it, expect } from 'vitest';
import {
  EMPTY,
  W_PAWN, W_KNIGHT, W_BISHOP, W_ROOK, W_QUEEN, W_KING,
  B_PAWN, B_KNIGHT, B_BISHOP, B_ROOK, B_QUEEN, B_KING,
} from '../../src/engine/types';
import {
  createEmptyBoard,
  initBoard,
  isSquareAttackedBy,
  findKing,
  isInCheck,
  pseudoLegalMoves,
  getLegalMoves,
  getAllLegalMoves,
  applyMoveToBoard,
  createInitialState,
  cloneState,
} from '../../src/engine/logic';
import type { ChessMove } from '../../src/engine/types';

describe('createEmptyBoard', () => {
  it('should create an 8x8 board filled with EMPTY', () => {
    const board = createEmptyBoard();
    expect(board.length).toBe(8);
    for (let r = 0; r < 8; r++) {
      expect(board[r].length).toBe(8);
      for (let c = 0; c < 8; c++) {
        expect(board[r][c]).toBe(EMPTY);
      }
    }
  });
});

describe('initBoard', () => {
  it('should set up the standard starting position', () => {
    const board = initBoard();

    // Back ranks
    expect(board[0]).toEqual([B_ROOK, B_KNIGHT, B_BISHOP, B_QUEEN, B_KING, B_BISHOP, B_KNIGHT, B_ROOK]);
    expect(board[7]).toEqual([W_ROOK, W_KNIGHT, W_BISHOP, W_QUEEN, W_KING, W_BISHOP, W_KNIGHT, W_ROOK]);

    // Pawn ranks
    for (let c = 0; c < 8; c++) {
      expect(board[1][c]).toBe(B_PAWN);
      expect(board[6][c]).toBe(W_PAWN);
    }

    // Empty squares
    for (let r = 2; r <= 5; r++) {
      for (let c = 0; c < 8; c++) {
        expect(board[r][c]).toBe(EMPTY);
      }
    }
  });

  it('should have exactly 32 pieces', () => {
    const board = initBoard();
    let count = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] !== EMPTY) count++;
      }
    }
    expect(count).toBe(32);
  });
});

describe('findKing', () => {
  it('should find white king in starting position', () => {
    const board = initBoard();
    expect(findKing(board, 'w')).toEqual({ row: 7, col: 4 });
  });

  it('should find black king in starting position', () => {
    const board = initBoard();
    expect(findKing(board, 'b')).toEqual({ row: 0, col: 4 });
  });

  it('should return null when king is missing', () => {
    const board = createEmptyBoard();
    expect(findKing(board, 'w')).toBeNull();
    expect(findKing(board, 'b')).toBeNull();
  });
});

describe('isInCheck', () => {
  it('should not be in check at starting position', () => {
    const state = createInitialState();
    expect(isInCheck(state.board, 'w')).toBe(false);
    expect(isInCheck(state.board, 'b')).toBe(false);
  });

  it('should detect check from pawn', () => {
    const board = createEmptyBoard();
    board[7][4] = W_KING;
    board[0][4] = B_KING;
    board[6][3] = B_PAWN;

    expect(isInCheck(board, 'w')).toBe(true);
  });

  it('should detect check from queen', () => {
    const board = createEmptyBoard();
    board[7][4] = W_KING;
    board[0][4] = B_KING;
    board[7][0] = B_QUEEN;

    expect(isInCheck(board, 'w')).toBe(true);
  });

  it('should detect check from bishop diagonal', () => {
    const board = createEmptyBoard();
    board[7][4] = W_KING;
    board[0][4] = B_KING;
    board[4][1] = B_BISHOP;

    expect(isInCheck(board, 'w')).toBe(true);
  });

  it('should not detect check when path is blocked', () => {
    const board = createEmptyBoard();
    board[7][4] = W_KING;
    board[0][4] = B_KING;
    board[7][0] = B_QUEEN;
    board[7][2] = W_PAWN; // blocks queen

    expect(isInCheck(board, 'w')).toBe(false);
  });

  it('should detect knight check', () => {
    const board = createEmptyBoard();
    board[7][4] = W_KING;
    board[0][4] = B_KING;
    board[5][3] = B_KNIGHT;

    expect(isInCheck(board, 'w')).toBe(true);
  });
});

describe('isSquareAttackedBy', () => {
  it('should detect pawn attacks', () => {
    const board = createEmptyBoard();
    board[3][3] = W_PAWN;

    expect(isSquareAttackedBy(board, 2, 2, 'w')).toBe(true);
    expect(isSquareAttackedBy(board, 2, 4, 'w')).toBe(true);
    expect(isSquareAttackedBy(board, 2, 3, 'w')).toBe(false); // pawns don't attack forward
  });

  it('should detect rook attacks along rank/file', () => {
    const board = createEmptyBoard();
    board[4][0] = W_ROOK;

    expect(isSquareAttackedBy(board, 4, 5, 'w')).toBe(true);
    expect(isSquareAttackedBy(board, 0, 0, 'w')).toBe(true);
    expect(isSquareAttackedBy(board, 3, 5, 'w')).toBe(false); // diagonal
  });

  it('should not attack through blocking pieces', () => {
    const board = createEmptyBoard();
    board[4][0] = W_ROOK;
    board[4][3] = B_PAWN; // blocking piece

    expect(isSquareAttackedBy(board, 4, 2, 'w')).toBe(true);
    expect(isSquareAttackedBy(board, 4, 5, 'w')).toBe(false);
  });
});

describe('pseudoLegalMoves', () => {
  it('should return empty array for empty square', () => {
    const board = createEmptyBoard();
    expect(pseudoLegalMoves(board, 0, 0)).toEqual([]);
  });

  it('should generate pawn forward moves', () => {
    const board = createEmptyBoard();
    board[6][4] = W_PAWN;

    const moves = pseudoLegalMoves(board, 6, 4);
    expect(moves).toHaveLength(2); // one and two squares
    expect(moves.some(m => m.to.row === 5 && m.to.col === 4)).toBe(true);
    expect(moves.some(m => m.to.row === 4 && m.to.col === 4)).toBe(true);
  });

  it('should generate pawn promotion moves', () => {
    const board = createEmptyBoard();
    board[1][4] = W_PAWN;

    const moves = pseudoLegalMoves(board, 1, 4);
    const promo = moves.find(m => m.to.row === 0 && m.promotion === 'q');
    expect(promo).toBeDefined();
  });

  it('should generate knight moves', () => {
    const board = createEmptyBoard();
    board[4][4] = W_KNIGHT;

    const moves = pseudoLegalMoves(board, 4, 4);
    expect(moves.length).toBe(8); // all 8 knight moves on open board
  });

  it('should not allow moving to friendly squares', () => {
    const board = createEmptyBoard();
    board[4][4] = W_KNIGHT;
    board[3][5] = W_PAWN; // friendly piece blocks

    const moves = pseudoLegalMoves(board, 4, 4);
    expect(moves.some(m => m.to.row === 3 && m.to.col === 5)).toBe(false);
  });
});

describe('getLegalMoves', () => {
  it('should filter moves that leave king in check', () => {
    const state = createInitialState();
    state.board = createEmptyBoard();
    state.board[7][4] = W_KING;
    state.board[0][4] = B_KING;
    state.board[6][4] = W_PAWN;
    state.board[5][4] = B_QUEEN; // queen attacks through pawn
    state.turn = 'w';

    const moves = getLegalMoves(state, 6, 4);
    // Pawn moving forward would expose king to queen
    const forwardMoves = moves.filter(m => m.to.row === 5 && m.to.col === 4);
    expect(forwardMoves).toHaveLength(0);
  });

  it('should allow all 20 legal starting moves', () => {
    const state = createInitialState();
    const allMoves = getAllLegalMoves(state, 'w');
    expect(allMoves.length).toBe(20);
  });

  it('should not allow castling through check', () => {
    const state = createInitialState();
    state.board = createEmptyBoard();
    state.board[7][4] = W_KING;
    state.board[7][7] = W_ROOK;
    state.board[0][4] = B_KING;
    state.board[5][3] = B_KNIGHT; // attacks e5 square (row 2, col 4 in our coords)
    // Actually let's put knight attacking f1 (row 7, col 5)
    state.board[7][5] = B_KNIGHT; // directly attacks through king's path
    state.castlingRights = { wK: true, wQ: true, bK: false, bQ: false };
    state.turn = 'w';

    const moves = getLegalMoves(state, 7, 4);
    const castleK = moves.find(m => m.castle === 'K');
    expect(castleK).toBeUndefined();
  });

  it('should allow kingside castling when path is clear', () => {
    const state = createInitialState();
    state.board = createEmptyBoard();
    state.board[7][4] = W_KING;
    state.board[7][7] = W_ROOK;
    state.board[0][4] = B_KING;
    state.castlingRights = { wK: true, wQ: false, bK: false, bQ: false };
    state.turn = 'w';

    const moves = getLegalMoves(state, 7, 4);
    const castleK = moves.find(m => m.castle === 'K');
    expect(castleK).toBeDefined();
    expect(castleK!.to).toEqual({ row: 7, col: 6 });
  });

  it('should allow queenside castling when path is clear', () => {
    const state = createInitialState();
    state.board = createEmptyBoard();
    state.board[7][4] = W_KING;
    state.board[7][0] = W_ROOK;
    state.board[0][4] = B_KING;
    state.castlingRights = { wK: false, wQ: true, bK: false, bQ: false };
    state.turn = 'w';

    const moves = getLegalMoves(state, 7, 4);
    const castleQ = moves.find(m => m.castle === 'Q');
    expect(castleQ).toBeDefined();
    expect(castleQ!.to).toEqual({ row: 7, col: 2 });
  });
});

describe('getAllLegalMoves', () => {
  it('should return moves for all pieces of a color', () => {
    const state = createInitialState();
    const whiteMoves = getAllLegalMoves(state, 'w');
    const blackMoves = getAllLegalMoves(state, 'b');

    expect(whiteMoves.length).toBe(20);
    expect(blackMoves.length).toBe(20);
  });

  it('should return no moves when all pieces are removed', () => {
    const state = createInitialState();
    state.board = createEmptyBoard();
    expect(getAllLegalMoves(state, 'w')).toEqual([]);
  });

  it('should restrict king moves when trapped by own pieces', () => {
    // King on a8 with pawns on a7/b7 — king can only go to b8
    const state = createInitialState();
    state.board = createEmptyBoard();
    state.board[0][0] = B_KING;
    state.board[1][0] = B_PAWN;
    state.board[1][1] = B_PAWN;
    state.board[7][4] = W_KING;
    state.turn = 'b';

    const kingMoves = getLegalMoves(state, 0, 0);
    expect(kingMoves).toHaveLength(1);
    expect(kingMoves[0].to).toEqual({ row: 0, col: 1 });
  });
});

describe('applyMoveToBoard', () => {
  it('should move a piece and clear source square', () => {
    const board = createEmptyBoard();
    board[6][4] = W_PAWN;

    const captured = applyMoveToBoard(board, { from: { row: 6, col: 4 }, to: { row: 4, col: 4 } });

    expect(board[4][4]).toBe(W_PAWN);
    expect(board[6][4]).toBe(EMPTY);
    expect(captured).toBe(0);
  });

  it('should capture a piece and return its value', () => {
    const board = createEmptyBoard();
    board[6][4] = W_PAWN;
    board[4][3] = B_KNIGHT;

    const captured = applyMoveToBoard(board, { from: { row: 6, col: 4 }, to: { row: 4, col: 3 } });

    expect(board[4][3]).toBe(W_PAWN);
    expect(board[6][4]).toBe(EMPTY);
    expect(captured).toBe(3); // knight value
  });

  it('should handle kingside castling', () => {
    const board = createEmptyBoard();
    board[7][4] = W_KING;
    board[7][7] = W_ROOK;

    applyMoveToBoard(board, { from: { row: 7, col: 4 }, to: { row: 7, col: 6 }, castle: 'K' });

    expect(board[7][6]).toBe(W_KING);
    expect(board[7][5]).toBe(W_ROOK);
    expect(board[7][4]).toBe(EMPTY);
    expect(board[7][7]).toBe(EMPTY);
  });

  it('should handle queenside castling', () => {
    const board = createEmptyBoard();
    board[7][4] = W_KING;
    board[7][0] = W_ROOK;

    applyMoveToBoard(board, { from: { row: 7, col: 4 }, to: { row: 7, col: 2 }, castle: 'Q' });

    expect(board[7][2]).toBe(W_KING);
    expect(board[7][3]).toBe(W_ROOK);
    expect(board[7][4]).toBe(EMPTY);
    expect(board[7][0]).toBe(EMPTY);
  });

  it('should handle en passant capture', () => {
    const board = createEmptyBoard();
    board[3][4] = W_PAWN;
    board[3][3] = B_PAWN;

    const captured = applyMoveToBoard(board, {
      from: { row: 3, col: 4 },
      to: { row: 2, col: 3 },
      enPassant: true,
    });

    expect(board[2][3]).toBe(W_PAWN);
    expect(board[3][3]).toBe(EMPTY); // captured pawn removed
    expect(board[3][4]).toBe(EMPTY);
    expect(captured).toBe(1);
  });

  it('should promote pawn to queen', () => {
    const board = createEmptyBoard();
    board[1][4] = W_PAWN;

    applyMoveToBoard(board, {
      from: { row: 1, col: 4 },
      to: { row: 0, col: 4 },
      promotion: 'q',
    });

    expect(board[0][4]).toBe(W_QUEEN);
    expect(board[1][4]).toBe(EMPTY);
  });
});

describe('createInitialState', () => {
  it('should create a complete game state', () => {
    const state = createInitialState();

    expect(state.turn).toBe('w');
    expect(state.selectedSquare).toBeNull();
    expect(state.legalMovesForSelected).toEqual([]);
    expect(state.lastMove).toBeNull();
    expect(state.moveHistory).toEqual([]);
    expect(state.capturedByWhite).toEqual([]);
    expect(state.capturedByBlack).toEqual([]);
    expect(state.gameOver).toBe(false);
    expect(state.gameStatus).toBe('normal');
    expect(state.enPassantTarget).toBeNull();
    expect(state.castlingRights).toEqual({ wK: true, wQ: true, bK: true, bQ: true });
    expect(state.halfmoveClock).toBe(0);
    expect(state.fullmoveNumber).toBe(1);
  });
});

describe('cloneState', () => {
  it('should create a deep copy of game state', () => {
    const state = createInitialState();
    const cloned = cloneState(state);

    // Modify original
    state.board[0][0] = W_KING;
    state.turn = 'b';
    state.castlingRights.wK = false;

    // Clone should be unaffected
    expect(cloned.board[0][0]).toBe(B_ROOK);
    expect(cloned.turn).toBe('w');
    expect(cloned.castlingRights.wK).toBe(true);
  });

  it('should deep copy enPassantTarget', () => {
    const state = createInitialState();
    state.enPassantTarget = { row: 4, col: 3 };
    const cloned = cloneState(state);

    state.enPassantTarget!.row = 0;
    expect(cloned.enPassantTarget!.row).toBe(4);
  });

  it('should deep copy lastMove', () => {
    const state = createInitialState();
    state.lastMove = { from: { row: 6, col: 4 }, to: { row: 4, col: 4 } };
    const cloned = cloneState(state);

    state.lastMove!.to.row = 0;
    expect(cloned.lastMove!.to.row).toBe(4);
  });
});

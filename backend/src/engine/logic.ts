import {
  B_BISHOP,
  B_KING,
  B_KNIGHT,
  B_PAWN,
  B_QUEEN,
  B_ROOK,
  CastlingRights,
  ChessMove,
  Coord,
  EMPTY,
  GameStatus,
  isEnemy,
  isFriendly,
  isWhite,
  isBlack,
  colorOf,
  PIECE_TYPE,
  PIECE_VALUE,
  W_BISHOP,
  W_KING,
  W_KNIGHT,
  W_PAWN,
  W_QUEEN,
  W_ROOK,
} from './types.js';

// ===================== Board Initialization =====================
export function createEmptyBoard(): number[][] {
  return Array.from({ length: 8 }, () => Array(8).fill(EMPTY));
}

export function initBoard(): number[][] {
  const board = createEmptyBoard();
  board[0] = [B_ROOK, B_KNIGHT, B_BISHOP, B_QUEEN, B_KING, B_BISHOP, B_KNIGHT, B_ROOK];
  board[1] = Array(8).fill(B_PAWN);
  for (let r = 2; r <= 5; r++) board[r] = Array(8).fill(EMPTY);
  board[6] = Array(8).fill(W_PAWN);
  board[7] = [W_ROOK, W_KNIGHT, W_BISHOP, W_QUEEN, W_KING, W_BISHOP, W_KNIGHT, W_ROOK];
  return board;
}

// ===================== Attack Detection =====================
export function isSquareAttackedBy(
  board: number[][],
  row: number,
  col: number,
  byColor: 'w' | 'b'
): boolean {
  // Pawn attacks
  if (byColor === 'w') {
    if (row + 1 < 8) {
      if (col - 1 >= 0 && board[row + 1][col - 1] === W_PAWN) return true;
      if (col + 1 < 8 && board[row + 1][col + 1] === W_PAWN) return true;
    }
  } else {
    if (row - 1 >= 0) {
      if (col - 1 >= 0 && board[row - 1][col - 1] === B_PAWN) return true;
      if (col + 1 < 8 && board[row - 1][col + 1] === B_PAWN) return true;
    }
  }

  // Knight attacks
  const knightPiece = byColor === 'w' ? W_KNIGHT : B_KNIGHT;
  const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]] as const;
  for (const [dr, dc] of knightMoves) {
    const nr = row + dr, nc = col + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === knightPiece) return true;
  }

  // King attacks
  const kingPiece = byColor === 'w' ? W_KING : B_KING;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr, nc = col + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === kingPiece) return true;
    }
  }

  // Sliding pieces: rook/queen (straight), bishop/queen (diagonal)
  const rPiece = byColor === 'w' ? W_ROOK : B_ROOK;
  const bPiece = byColor === 'w' ? W_BISHOP : B_BISHOP;
  const qPiece = byColor === 'w' ? W_QUEEN : B_QUEEN;

  const straightDirs = [[0,1],[0,-1],[1,0],[-1,0]] as const;
  for (const [dr, dc] of straightDirs) {
    let nr = row + dr, nc = col + dc;
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      if (board[nr][nc] !== EMPTY) {
        if (board[nr][nc] === rPiece || board[nr][nc] === qPiece) return true;
        break;
      }
      nr += dr; nc += dc;
    }
  }

  const diagDirs = [[1,1],[1,-1],[-1,1],[-1,-1]] as const;
  for (const [dr, dc] of diagDirs) {
    let nr = row + dr, nc = col + dc;
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      if (board[nr][nc] !== EMPTY) {
        if (board[nr][nc] === bPiece || board[nr][nc] === qPiece) return true;
        break;
      }
      nr += dr; nc += dc;
    }
  }

  return false;
}

export function findKing(board: number[][], color: 'w' | 'b'): Coord | null {
  const king = color === 'w' ? W_KING : B_KING;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === king) return { row: r, col: c };
    }
  }
  return null;
}

export function isInCheck(board: number[][], color: 'w' | 'b'): boolean {
  const king = findKing(board, color);
  if (!king) return false;
  const enemy: 'w' | 'b' = color === 'w' ? 'b' : 'w';
  return isSquareAttackedBy(board, king.row, king.col, enemy);
}

// ===================== Legal Move Generation =====================
export function pseudoLegalMoves(
  board: number[][],
  row: number,
  col: number
): ChessMove[] {
  const piece = board[row][col];
  if (piece === EMPTY) return [];
  const color = isWhite(piece) ? 'w' : 'b';
  const moves: ChessMove[] = [];
  const type = PIECE_TYPE[piece];

  function addIfValid(tr: number, tc: number): boolean {
    if (tr < 0 || tr > 7 || tc < 0 || tc > 7) return false;
    if (isFriendly(board[tr][tc], color)) return false;
    moves.push({ from: { row, col }, to: { row: tr, col: tc } });
    return board[tr][tc] === EMPTY;
  }

  if (type === 'p') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    const promoRow = color === 'w' ? 0 : 7;

    // Forward one
    if (row + dir >= 0 && row + dir < 8 && board[row + dir][col] === EMPTY) {
      if (row + dir === promoRow) {
        moves.push({ from: { row, col }, to: { row: row + dir, col }, promotion: 'q' });
      } else {
        moves.push({ from: { row, col }, to: { row: row + dir, col } });
        // Forward two from start
        if (row === startRow && board[row + 2 * dir][col] === EMPTY) {
          moves.push({ from: { row, col }, to: { row: row + 2 * dir, col } });
        }
      }
    }
    // Captures
    for (const dc of [-1, 1]) {
      const tr = row + dir, tc = col + dc;
      if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
        if (isEnemy(board[tr][tc], color)) {
          if (tr === promoRow) {
            moves.push({ from: { row, col }, to: { row: tr, col: tc }, promotion: 'q' });
          } else {
            moves.push({ from: { row, col }, to: { row: tr, col: tc } });
          }
        }
      }
    }
  } else if (type === 'n') {
    const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]] as const;
    for (const [dr, dc] of offsets) addIfValid(row + dr, col + dc);
  } else if (type === 'b') {
    for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]] as const) {
      let nr = row + dr, nc = col + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (!addIfValid(nr, nc)) break;
        if (board[nr][nc] !== EMPTY) break;
        nr += dr; nc += dc;
      }
    }
  } else if (type === 'r') {
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]] as const) {
      let nr = row + dr, nc = col + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (!addIfValid(nr, nc)) break;
        if (board[nr][nc] !== EMPTY) break;
        nr += dr; nc += dc;
      }
    }
  } else if (type === 'q') {
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]] as const) {
      let nr = row + dr, nc = col + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (!addIfValid(nr, nc)) break;
        if (board[nr][nc] !== EMPTY) break;
        nr += dr; nc += dc;
      }
    }
  } else if (type === 'k') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        addIfValid(row + dr, col + dc);
      }
    }
  }

  return moves;
}

// ===================== Apply Move to Board (internal) =====================
export function applyMoveToBoard(
  board: number[][],
  move: ChessMove,
): number {
  // Returns captured piece ID (0 if none)
  const piece = board[move.from.row][move.from.col];
  let capturedPiece = 0;

  // En passant capture
  if (move.enPassant) {
    const capturedRow = isWhite(piece) ? move.to.row + 1 : move.to.row - 1;
    capturedPiece = board[capturedRow][move.to.col];
    board[capturedRow][move.to.col] = EMPTY;
  } else if (board[move.to.row][move.to.col] !== EMPTY) {
    capturedPiece = board[move.to.row][move.to.col];
  }

  board[move.to.row][move.to.col] = piece;
  board[move.from.row][move.from.col] = EMPTY;

  // Castling rook move
  if (move.castle) {
    if (move.to.col === 6) { // kingside
      board[move.to.row][5] = board[move.to.row][7];
      board[move.to.row][7] = EMPTY;
    } else if (move.to.col === 2) { // queenside
      board[move.to.row][3] = board[move.to.row][0];
      board[move.to.row][0] = EMPTY;
    }
  }

  // Promotion
  if (move.promotion) {
    board[move.to.row][move.to.col] = isWhite(piece) ? W_QUEEN : B_QUEEN;
  }

  return capturedPiece;
}

// ===================== Full Game State =====================
export interface GameContext {
  board: number[][];
  turn: 'w' | 'b';
  selectedSquare: Coord | null;
  legalMovesForSelected: ChessMove[];
  lastMove: ChessMove | null;
  moveHistory: string[];
  capturedByWhite: number[];
  capturedByBlack: number[];
  gameOver: boolean;
  gameStatus: GameStatus;
  enPassantTarget: Coord | null;
  castlingRights: CastlingRights;
  halfmoveClock: number;
  fullmoveNumber: number;
}

export function createInitialState(): GameContext {
  return {
    board: initBoard(),
    turn: 'w',
    selectedSquare: null,
    legalMovesForSelected: [],
    lastMove: null,
    moveHistory: [],
    capturedByWhite: [],
    capturedByBlack: [],
    gameOver: false,
    gameStatus: 'normal' as GameStatus,
    enPassantTarget: null,
    castlingRights: { wK: true, wQ: true, bK: true, bQ: true },
    halfmoveClock: 0,
    fullmoveNumber: 1,
  };
}

export function cloneState(state: GameContext): GameContext {
  return {
    ...state,
    board: state.board.map(r => [...r]),
    legalMovesForSelected: state.legalMovesForSelected.map(m => ({ ...m })),
    lastMove: state.lastMove ? { ...state.lastMove } : null,
    enPassantTarget: state.enPassantTarget ? { ...state.enPassantTarget } : null,
    castlingRights: { ...state.castlingRights },
    capturedByWhite: [...state.capturedByWhite],
    capturedByBlack: [...state.capturedByBlack],
    moveHistory: [...state.moveHistory],
  };
}

// ===================== Legal Moves with Check Filtering =====================
export function getLegalMoves(
  state: GameContext,
  row: number,
  col: number
): ChessMove[] {
  const piece = state.board[row][col];
  if (piece === EMPTY) return [];
  const color = isWhite(piece) ? 'w' : 'b';
  const pseudo = pseudoLegalMoves(state.board, row, col);

  // Add en passant moves
  if (state.enPassantTarget && PIECE_TYPE[piece] === 'p' &&
      Math.abs(col - state.enPassantTarget.col) === 1 &&
      Math.abs(row - state.enPassantTarget.row) === 1) {
    const exists = pseudo.some(m => m.to.row === state.enPassantTarget!.row && m.to.col === state.enPassantTarget!.col);
    if (!exists) {
      pseudo.push({ from: { row, col }, to: { ...state.enPassantTarget! }, enPassant: true });
    }
  }

  // Add castling moves
  if (PIECE_TYPE[piece] === 'k') {
    const enemy: 'w' | 'b' = color === 'w' ? 'b' : 'w';
    if (!isSquareAttackedBy(state.board, row, col, enemy)) {
      const onStartingSquare = color === 'w'
        ? row === 7 && col === 4 && piece === W_KING
        : row === 0 && col === 4 && piece === B_KING;

      if (color === 'w' && onStartingSquare && state.castlingRights.wK && state.board[7][7] === W_ROOK) {
        if (state.board[7][5] === EMPTY && state.board[7][6] === EMPTY &&
            !isSquareAttackedBy(state.board, 7, 5, enemy) && !isSquareAttackedBy(state.board, 7, 6, enemy)) {
          pseudo.push({ from: { row, col }, to: { row: 7, col: 6 }, castle: 'K' });
        }
      }
      if (color === 'w' && onStartingSquare && state.castlingRights.wQ && state.board[7][0] === W_ROOK) {
        if (state.board[7][1] === EMPTY && state.board[7][2] === EMPTY && state.board[7][3] === EMPTY &&
            !isSquareAttackedBy(state.board, 7, 3, enemy) && !isSquareAttackedBy(state.board, 7, 2, enemy)) {
          pseudo.push({ from: { row, col }, to: { row: 7, col: 2 }, castle: 'Q' });
        }
      }
      if (color === 'b' && onStartingSquare && state.castlingRights.bK && state.board[0][7] === B_ROOK) {
        if (state.board[0][5] === EMPTY && state.board[0][6] === EMPTY &&
            !isSquareAttackedBy(state.board, 0, 5, enemy) && !isSquareAttackedBy(state.board, 0, 6, enemy)) {
          pseudo.push({ from: { row, col }, to: { row: 0, col: 6 }, castle: 'K' });
        }
      }
      if (color === 'b' && onStartingSquare && state.castlingRights.bQ && state.board[0][0] === B_ROOK) {
        if (state.board[0][1] === EMPTY && state.board[0][2] === EMPTY && state.board[0][3] === EMPTY &&
            !isSquareAttackedBy(state.board, 0, 3, enemy) && !isSquareAttackedBy(state.board, 0, 2, enemy)) {
          pseudo.push({ from: { row, col }, to: { row: 0, col: 2 }, castle: 'Q' });
        }
      }
    }
  }

  const legal: ChessMove[] = [];
  for (const move of pseudo) {
    const savedBoard = state.board.map(r => [...r]);
    const savedEP = state.enPassantTarget;
    const savedCR = { ...state.castlingRights };

    applyMoveToBoard(state.board, move);

    if (!isInCheck(state.board, color)) {
      legal.push(move);
    }

    state.board = savedBoard;
    state.enPassantTarget = savedEP;
    state.castlingRights = savedCR;
  }

  return legal;
}

export function getAllLegalMoves(state: GameContext, color: 'w' | 'b'): ChessMove[] {
  const all: ChessMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (state.board[r][c] !== EMPTY && colorOf(state.board[r][c]) === color) {
        const moves = getLegalMoves(state, r, c);
        all.push(...moves);
      }
    }
  }
  return all;
}

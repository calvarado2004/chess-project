import { useState, useCallback, useEffect, useRef } from 'react';
import {
  EMPTY, W_PAWN, W_KNIGHT, W_BISHOP, W_ROOK, W_QUEEN, W_KING,
  B_PAWN, B_KNIGHT, B_BISHOP, B_ROOK, B_QUEEN, B_KING,
  PIECE_UNICODE, PIECE_TYPE,
  FILES, RANKS, STRENGTH_MAP,
  EngineStatus, EngineEval, GameMode, ChessMove, Coord, GameStatus,
} from '../engine';

// ===================== Helpers =====================
function isWhite(p: number) { return p >= W_PAWN && p <= W_KING; }
function isBlack(p: number) { return p >= B_PAWN && p <= B_KING; }
function colorOf(p: number): 'w' | 'b' | null {
  if (isWhite(p)) return 'w';
  if (isBlack(p)) return 'b';
  return null;
}
function isFriendly(p: number, c: 'w' | 'b') { return c === 'w' ? isWhite(p) : isBlack(p); }
function isEnemy(p: number, c: 'w' | 'b') { return c === 'w' ? isBlack(p) : isWhite(p); }
function rowColToFileRank(row: number, col: number) { return FILES[col] + RANKS[row]; }

// ===================== Game State (all in refs, like original globals) =====================
const state = {
  board: initBoard(),
  turn: 'w' as 'w' | 'b',
  selectedSquare: null as Coord | null,
  legalMovesForSelected: [] as ChessMove[],
  lastMove: null as ChessMove | null,
  moveHistory: [] as string[],
  capturedByWhite: [] as number[],
  capturedByBlack: [] as number[],
  gameOver: false,
  gameStatus: 'normal' as GameStatus,
  enPassantTarget: null as Coord | null,
  castlingRights: { wK: true, wQ: true, bK: true, bQ: true },
  halfmoveClock: 0,
  fullmoveNumber: 1,
  gameMode: 'hwe' as GameMode,
  strengthLevel: 'elo-800',
  whiteName: 'You',
  blackName: 'Stockfish',
  engineStatus: 'unavailable' as EngineStatus,
  engineEval: null as EngineEval | null,
  lastEngineBestMove: null as string | null,
  retractSnapshots: [] as GameSnapshot[],
  retractCount: 0,
  retractUsed: false,
};

const MAX_STOCKFISH_RETRACTS = 3;

interface GameSnapshot {
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
  castlingRights: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  halfmoveClock: number;
  fullmoveNumber: number;
  whiteTime: number;
  blackTime: number;
  clockRunning: boolean;
  engineEval: EngineEval | null;
  lastEngineBestMove: string | null;
}

function initBoard(): number[][] {
  const b = Array.from({ length: 8 }, () => Array(8).fill(EMPTY));
  b[0] = [B_ROOK, B_KNIGHT, B_BISHOP, B_QUEEN, B_KING, B_BISHOP, B_KNIGHT, B_ROOK];
  b[1] = Array(8).fill(B_PAWN);
  for (let r = 2; r <= 5; r++) b[r] = Array(8).fill(EMPTY);
  b[6] = Array(8).fill(W_PAWN);
  b[7] = [W_ROOK, W_KNIGHT, W_BISHOP, W_QUEEN, W_KING, W_BISHOP, W_KNIGHT, W_ROOK];
  return b;
}

function resetState(timeControlMinutes: number = 10) {
  clearPendingEngineMoveDelay();
  state.board = initBoard();
  state.turn = 'w';
  state.selectedSquare = null;
  state.legalMovesForSelected = [];
  state.lastMove = null;
  state.moveHistory = [];
  state.capturedByWhite = [];
  state.capturedByBlack = [];
  state.gameOver = false;
  state.gameStatus = 'normal';
  setEnPassantTarget(null);
  state.castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
  state.halfmoveClock = 0;
  state.fullmoveNumber = 1;
  state.engineEval = null;
  state.lastEngineBestMove = null;
  state.retractSnapshots = [];
  state.retractCount = 0;
  state.retractUsed = false;
  clockRunning = false;
  if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
  whiteTime = timeControlMinutes * 60;
  blackTime = timeControlMinutes * 60;
  clockRef.current = { whiteTime, blackTime, running: false };
}

function configurePlayerNames() {
  if (state.gameMode === 'hwe') {
    state.whiteName = 'You';
    state.blackName = 'Stockfish';
  } else if (state.gameMode === 'hbe') {
    state.whiteName = 'Stockfish';
    state.blackName = 'You';
  } else {
    state.whiteName = 'White';
    state.blackName = 'Black';
  }
}

function cloneCoord(coord: Coord | null): Coord | null {
  return coord ? { ...coord } : null;
}

function setEnPassantTarget(target: Coord | null) {
  enPassantTarget = cloneCoord(target);
  state.enPassantTarget = cloneCoord(target);
}

function cloneMove(move: ChessMove | null): ChessMove | null {
  return move
    ? {
        ...move,
        from: { ...move.from },
        to: { ...move.to },
      }
    : null;
}

function createSnapshot(): GameSnapshot {
  return {
    board: state.board.map((row) => [...row]),
    turn: state.turn,
    selectedSquare: cloneCoord(state.selectedSquare),
    legalMovesForSelected: state.legalMovesForSelected.map((move) => cloneMove(move)!),
    lastMove: cloneMove(state.lastMove),
    moveHistory: [...state.moveHistory],
    capturedByWhite: [...state.capturedByWhite],
    capturedByBlack: [...state.capturedByBlack],
    gameOver: state.gameOver,
    gameStatus: state.gameStatus,
    enPassantTarget: cloneCoord(enPassantTarget),
    castlingRights: { ...state.castlingRights },
    halfmoveClock: state.halfmoveClock,
    fullmoveNumber: state.fullmoveNumber,
    whiteTime,
    blackTime,
    clockRunning,
    engineEval: state.engineEval ? { ...state.engineEval } : null,
    lastEngineBestMove: state.lastEngineBestMove,
  };
}

function restoreSnapshot(snapshot: GameSnapshot) {
  state.board = snapshot.board.map((row) => [...row]);
  state.turn = snapshot.turn;
  state.selectedSquare = cloneCoord(snapshot.selectedSquare);
  state.legalMovesForSelected = snapshot.legalMovesForSelected.map((move) => cloneMove(move)!);
  state.lastMove = cloneMove(snapshot.lastMove);
  state.moveHistory = [...snapshot.moveHistory];
  state.capturedByWhite = [...snapshot.capturedByWhite];
  state.capturedByBlack = [...snapshot.capturedByBlack];
  state.gameOver = snapshot.gameOver;
  state.gameStatus = snapshot.gameStatus;
  setEnPassantTarget(snapshot.enPassantTarget);
  state.castlingRights = { ...snapshot.castlingRights };
  state.halfmoveClock = snapshot.halfmoveClock;
  state.fullmoveNumber = snapshot.fullmoveNumber;
  whiteTime = snapshot.whiteTime;
  blackTime = snapshot.blackTime;
  state.engineEval = snapshot.engineEval ? { ...snapshot.engineEval } : null;
  state.lastEngineBestMove = snapshot.lastEngineBestMove;
  lastEngineBestMoveRef.current = snapshot.lastEngineBestMove;
  engineEvalRef.current = state.engineEval;
  clockRef.current = { whiteTime, blackTime, running: snapshot.clockRunning };

  if (snapshot.clockRunning && !state.gameOver) startClock();
}

// ===================== Attack Detection =====================
function isSquareAttackedBy(row: number, col: number, byColor: 'w' | 'b'): boolean {
  if (byColor === 'w') {
    if (row + 1 < 8) {
      if (col - 1 >= 0 && state.board[row + 1][col - 1] === W_PAWN) return true;
      if (col + 1 < 8 && state.board[row + 1][col + 1] === W_PAWN) return true;
    }
  } else {
    if (row - 1 >= 0) {
      if (col - 1 >= 0 && state.board[row - 1][col - 1] === B_PAWN) return true;
      if (col + 1 < 8 && state.board[row - 1][col + 1] === B_PAWN) return true;
    }
  }
  const knightPiece = byColor === 'w' ? W_KNIGHT : B_KNIGHT;
  for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]] as const) {
    const nr = row + dr, nc = col + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && state.board[nr][nc] === knightPiece) return true;
  }
  const kingPiece = byColor === 'w' ? W_KING : B_KING;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr, nc = col + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && state.board[nr][nc] === kingPiece) return true;
    }
  }
  const rPiece = byColor === 'w' ? W_ROOK : B_ROOK;
  const bPiece = byColor === 'w' ? W_BISHOP : B_BISHOP;
  const qPiece = byColor === 'w' ? W_QUEEN : B_QUEEN;
  for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]] as const) {
    let nr = row + dr, nc = col + dc;
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      if (state.board[nr][nc] !== EMPTY) {
        if (state.board[nr][nc] === rPiece || state.board[nr][nc] === qPiece) return true;
        break;
      }
      nr += dr; nc += dc;
    }
  }
  for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]] as const) {
    let nr = row + dr, nc = col + dc;
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      if (state.board[nr][nc] !== EMPTY) {
        if (state.board[nr][nc] === bPiece || state.board[nr][nc] === qPiece) return true;
        break;
      }
      nr += dr; nc += dc;
    }
  }
  return false;
}

function findKing(color: 'w' | 'b'): Coord | null {
  const king = color === 'w' ? W_KING : B_KING;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (state.board[r][c] === king) return { row: r, col: c };
  return null;
}

function isInCheck(color: 'w' | 'b'): boolean {
  const king = findKing(color);
  if (!king) return false;
  return isSquareAttackedBy(king.row, king.col, color === 'w' ? 'b' : 'w');
}

// ===================== Move Generation =====================
function pseudoLegalMoves(row: number, col: number): ChessMove[] {
  const piece = state.board[row][col];
  if (piece === EMPTY) return [];
  const color = colorOf(piece)!;
  const moves: ChessMove[] = [];
  const type = PIECE_TYPE[piece];

  function addIfValid(tr: number, tc: number): boolean {
    if (tr < 0 || tr > 7 || tc < 0 || tc > 7) return false;
    if (isFriendly(state.board[tr][tc], color)) return false;
    moves.push({ from: { row, col }, to: { row: tr, col: tc } });
    return state.board[tr][tc] === EMPTY;
  }

  if (type === 'p') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    const promoRow = color === 'w' ? 0 : 7;
    if (row + dir >= 0 && row + dir < 8 && state.board[row + dir][col] === EMPTY) {
      if (row + dir === promoRow) {
        moves.push({ from: { row, col }, to: { row: row + dir, col }, promotion: 'q' });
      } else {
        moves.push({ from: { row, col }, to: { row: row + dir, col } });
        if (row === startRow && state.board[row + 2 * dir][col] === EMPTY) {
          moves.push({ from: { row, col }, to: { row: row + 2 * dir, col } });
        }
      }
    }
    for (const dc of [-1, 1]) {
      const tr = row + dir, tc = col + dc;
      if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
        if (isEnemy(state.board[tr][tc], color)) {
          if (tr === promoRow) {
            moves.push({ from: { row, col }, to: { row: tr, col: tc }, promotion: 'q' });
          } else {
            moves.push({ from: { row, col }, to: { row: tr, col: tc } });
          }
        }
        if (state.enPassantTarget && state.enPassantTarget.row === tr && state.enPassantTarget.col === tc) {
          moves.push({ from: { row, col }, to: { row: tr, col: tc }, enPassant: true });
        }
      }
    }
  } else if (type === 'n') {
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]] as const) addIfValid(row + dr, col + dc);
  } else if (type === 'b') {
    for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]] as const) {
      let nr = row + dr, nc = col + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (!addIfValid(nr, nc)) break;
        if (state.board[nr][nc] !== EMPTY) break;
        nr += dr; nc += dc;
      }
    }
  } else if (type === 'r') {
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]] as const) {
      let nr = row + dr, nc = col + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (!addIfValid(nr, nc)) break;
        if (state.board[nr][nc] !== EMPTY) break;
        nr += dr; nc += dc;
      }
    }
  } else if (type === 'q') {
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]] as const) {
      let nr = row + dr, nc = col + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (!addIfValid(nr, nc)) break;
        if (state.board[nr][nc] !== EMPTY) break;
        nr += dr; nc += dc;
      }
    }
  } else if (type === 'k') {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        addIfValid(row + dr, col + dc);
      }
  }
  return moves;
}

let enPassantTarget: Coord | null = null;

function getLegalMoves(row: number, col: number): ChessMove[] {
  const piece = state.board[row][col];
  if (piece === EMPTY) return [];
  const color = colorOf(piece)!;
  const pseudo = pseudoLegalMoves(row, col);

  // Add en passant
  if (enPassantTarget && PIECE_TYPE[piece] === 'p' &&
      Math.abs(col - enPassantTarget.col) === 1 &&
      Math.abs(row - enPassantTarget.row) === 1) {
    if (!pseudo.some(m => m.to.row === enPassantTarget!.row && m.to.col === enPassantTarget!.col)) {
      pseudo.push({ from: { row, col }, to: { ...enPassantTarget! }, enPassant: true });
    }
  }

  // Add castling
  if (PIECE_TYPE[piece] === 'k') {
    const enemy: 'w' | 'b' = color === 'w' ? 'b' : 'w';
    if (!isSquareAttackedBy(row, col, enemy)) {
      const onStartingSquare = color === 'w'
        ? row === 7 && col === 4 && piece === W_KING
        : row === 0 && col === 4 && piece === B_KING;

      if (color === 'w' && onStartingSquare && state.castlingRights.wK && state.board[7][7] === W_ROOK && state.board[7][5] === EMPTY && state.board[7][6] === EMPTY && !isSquareAttackedBy(7, 5, enemy) && !isSquareAttackedBy(7, 6, enemy))
        pseudo.push({ from: { row, col }, to: { row: 7, col: 6 }, castle: 'K' });
      if (color === 'w' && onStartingSquare && state.castlingRights.wQ && state.board[7][0] === W_ROOK && state.board[7][1] === EMPTY && state.board[7][2] === EMPTY && state.board[7][3] === EMPTY && !isSquareAttackedBy(7, 3, enemy) && !isSquareAttackedBy(7, 2, enemy))
        pseudo.push({ from: { row, col }, to: { row: 7, col: 2 }, castle: 'Q' });
      if (color === 'b' && onStartingSquare && state.castlingRights.bK && state.board[0][7] === B_ROOK && state.board[0][5] === EMPTY && state.board[0][6] === EMPTY && !isSquareAttackedBy(0, 5, enemy) && !isSquareAttackedBy(0, 6, enemy))
        pseudo.push({ from: { row, col }, to: { row: 0, col: 6 }, castle: 'K' });
      if (color === 'b' && onStartingSquare && state.castlingRights.bQ && state.board[0][0] === B_ROOK && state.board[0][1] === EMPTY && state.board[0][2] === EMPTY && state.board[0][3] === EMPTY && !isSquareAttackedBy(0, 3, enemy) && !isSquareAttackedBy(0, 2, enemy))
        pseudo.push({ from: { row, col }, to: { row: 0, col: 2 }, castle: 'Q' });
    }
  }

  const legal: ChessMove[] = [];
  for (const move of pseudo) {
    const savedBoard = state.board.map(r => [...r]);
    const savedEP = cloneCoord(enPassantTarget);
    const savedStateEP = cloneCoord(state.enPassantTarget);
    const savedCR = { ...state.castlingRights };
    applyMoveToBoard(move);
    if (!isInCheck(color)) legal.push(move);
    state.board = savedBoard;
    enPassantTarget = savedEP;
    state.enPassantTarget = savedStateEP;
    state.castlingRights = savedCR;
  }
  return legal;
}

function getAllLegalMoves(color: 'w' | 'b'): ChessMove[] {
  const all: ChessMove[] = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (state.board[r][c] !== EMPTY && colorOf(state.board[r][c]) === color)
        all.push(...getLegalMoves(r, c));
  return all;
}

function isStockfishMode(): boolean {
  return state.gameMode === 'hwe' || state.gameMode === 'hbe';
}

function isHumanTurnInStockfishMode(): boolean {
  return (state.gameMode === 'hwe' && state.turn === 'w') || (state.gameMode === 'hbe' && state.turn === 'b');
}

// ===================== Move Execution =====================
function applyMoveToBoard(move: ChessMove) {
  const piece = state.board[move.from.row][move.from.col];
  state.board[move.to.row][move.to.col] = piece;
  state.board[move.from.row][move.from.col] = EMPTY;
  if (move.enPassant) {
    const capturedRow = colorOf(piece) === 'w' ? move.to.row + 1 : move.to.row - 1;
    state.board[capturedRow][move.to.col] = EMPTY;
  }
  if (move.castle) {
    if (move.to.col === 6) { state.board[move.to.row][5] = state.board[move.to.row][7]; state.board[move.to.row][7] = EMPTY; }
    else if (move.to.col === 2) { state.board[move.to.row][3] = state.board[move.to.row][0]; state.board[move.to.row][0] = EMPTY; }
  }
  if (move.promotion) {
    state.board[move.to.row][move.to.col] = colorOf(piece) === 'w' ? W_QUEEN : B_QUEEN;
  }
  let nextEnPassantTarget: Coord | null = null;
  if (PIECE_TYPE[piece] === 'p' && Math.abs(move.to.row - move.from.row) === 2) {
    nextEnPassantTarget = { row: (move.from.row + move.to.row) / 2, col: move.from.col };
  }
  setEnPassantTarget(nextEnPassantTarget);
}

function executeMove(move: ChessMove) {
  const piece = state.board[move.from.row][move.from.col];
  let captured = state.board[move.to.row][move.to.col];
  const color = colorOf(piece)!;

  if (move.enPassant) {
    const capturedRow = color === 'w' ? move.to.row + 1 : move.to.row - 1;
    captured = state.board[capturedRow][move.to.col];
    state.board[capturedRow][move.to.col] = EMPTY;
  }

  if (captured !== EMPTY) {
    if (color === 'w') state.capturedByWhite.push(captured);
    else state.capturedByBlack.push(captured);
  }

  let notation = buildSAN(move, piece, captured);

  if (piece === W_KING) { state.castlingRights.wK = false; state.castlingRights.wQ = false; }
  if (piece === B_KING) { state.castlingRights.bK = false; state.castlingRights.bQ = false; }
  if (piece === W_ROOK && move.from.row === 7 && move.from.col === 0) state.castlingRights.wQ = false;
  if (piece === W_ROOK && move.from.row === 7 && move.from.col === 7) state.castlingRights.wK = false;
  if (piece === B_ROOK && move.from.row === 0 && move.from.col === 0) state.castlingRights.bQ = false;
  if (piece === B_ROOK && move.from.row === 0 && move.from.col === 7) state.castlingRights.bK = false;
  if (move.to.row === 7 && move.to.col === 0) state.castlingRights.wQ = false;
  if (move.to.row === 7 && move.to.col === 7) state.castlingRights.wK = false;
  if (move.to.row === 0 && move.to.col === 0) state.castlingRights.bQ = false;
  if (move.to.row === 0 && move.to.col === 7) state.castlingRights.bK = false;

  applyMoveToBoard(move);

  if (PIECE_TYPE[piece] === 'p' || captured !== EMPTY) state.halfmoveClock = 0;
  else state.halfmoveClock++;

  state.lastMove = move;
  if (state.turn === 'b') state.fullmoveNumber++;
  state.turn = state.turn === 'w' ? 'b' : 'w';

  if (!clockRunning && !state.gameOver) startClock();

  const inCheck = isInCheck(state.turn);
  const allMoves = getAllLegalMoves(state.turn);
  if (allMoves.length === 0) {
    if (inCheck) { state.gameStatus = 'checkmate'; state.gameOver = true; notation += '#'; }
    else { state.gameStatus = 'stalemate'; state.gameOver = true; }
  } else if (inCheck) {
    state.gameStatus = 'check';
    notation += '+';
  } else {
    state.gameStatus = 'normal';
  }

  state.moveHistory.push(notation);
  state.selectedSquare = null;
  state.legalMovesForSelected = [];

  // Sounds
  if (move.promotion) playPromotionSound();
  else if (captured !== EMPTY || move.enPassant) playCaptureSound();
  else playMoveSound();
  if (state.gameStatus === 'checkmate') playCheckmateSound();
  else if (state.gameStatus === 'stalemate') playStalemateSound();
  else if (state.gameStatus === 'check') playCheckSound();

  if (state.gameOver) stopClock();

  // Trigger re-render
  renderTrigger.current();

  if (!state.gameOver && isEngineTurn()) {
    startEngineTurnIfNeeded();
  } else {
    requestAnalysis();
  }
}

function retractHumanStockfishMove(): boolean {
  if (!isStockfishMode()) return false;
  if (state.retractCount >= MAX_STOCKFISH_RETRACTS) return false;
  const snapshot = state.retractSnapshots.pop();
  if (!snapshot) return false;

  clearPendingEngineMoveDelay();
  if (engine && currentEngineRequest) engine.postMessage('stop');
  currentEngineRequest = null;
  state.engineStatus = engineReady ? 'ready' : state.engineStatus;
  engineStatusRef.current = state.engineStatus;
  stopClock();
  restoreSnapshot(snapshot);
  state.retractCount++;
  state.retractUsed = true;
  state.selectedSquare = null;
  state.legalMovesForSelected = [];
  requestAnalysis();
  renderTrigger.current();
  return true;
}

function buildSAN(move: ChessMove, piece: number, captured: number): string {
  const toSq = rowColToFileRank(move.to.row, move.to.col);
  if (move.castle === 'K') return 'O-O';
  if (move.castle === 'Q') return 'O-O-O';

  const pType = PIECE_TYPE[piece];
  const isCapture = captured !== EMPTY || move.enPassant;

  if (pType === 'p') {
    return `${isCapture ? `${FILES[move.from.col]}x` : ''}${toSq}${move.promotion ? `=${move.promotion.toUpperCase()}` : ''}`;
  }

  const sameTypeCandidates: ChessMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (r === move.from.row && c === move.from.col) continue;
      const candidatePiece = state.board[r][c];
      if (candidatePiece === EMPTY || colorOf(candidatePiece) !== colorOf(piece)) continue;
      if (PIECE_TYPE[candidatePiece] !== pType) continue;
      sameTypeCandidates.push(...getLegalMoves(r, c).filter((candidate) =>
        candidate.to.row === move.to.row && candidate.to.col === move.to.col
      ));
    }
  }

  let disambiguation = '';
  if (sameTypeCandidates.length > 0) {
    const sameFile = sameTypeCandidates.some((candidate) => candidate.from.col === move.from.col);
    const sameRank = sameTypeCandidates.some((candidate) => candidate.from.row === move.from.row);
    if (!sameFile) disambiguation = FILES[move.from.col];
    else if (!sameRank) disambiguation = RANKS[move.from.row];
    else disambiguation = rowColToFileRank(move.from.row, move.from.col);
  }

  return `${pType.toUpperCase()}${disambiguation}${isCapture ? 'x' : ''}${toSq}`;
}

// ===================== Clock =====================
let clockInterval: ReturnType<typeof setInterval> | null = null;
let whiteTime = 600;
let blackTime = 600;
let clockRunning = false;

interface ClockState { whiteTime: number; blackTime: number; running: boolean; }

// Refs to bridge module-level functions and React state
const clockRef = { current: { whiteTime: 600, blackTime: 600, running: false } as ClockState };
const engineStatusRef = { current: 'unavailable' as EngineStatus };
const engineEvalRef = { current: null as EngineEval | null };
const lastEngineBestMoveRef = { current: null as string | null };
const renderTrigger = { current: () => {} };

function startClock() {
  clockRunning = true;
  clockRef.current = { ...clockRef.current, running: true };
  clockInterval = setInterval(() => {
    if (!clockRunning || state.gameOver) return;
    if (state.turn === 'w') {
      whiteTime--;
      if (whiteTime <= 0) {
        whiteTime = 0;
        state.gameOver = true;
        state.gameStatus = 'black_time_win';
        stopClock();
        renderTrigger.current();
        return;
      }
    } else {
      blackTime--;
      if (blackTime <= 0) {
        blackTime = 0;
        state.gameOver = true;
        state.gameStatus = 'white_time_win';
        stopClock();
        renderTrigger.current();
        return;
      }
    }
    clockRef.current = { whiteTime, blackTime, running: clockRunning };
  }, 1000);
}

function stopClock() {
  clockRunning = false;
  if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
  clockRef.current = { whiteTime, blackTime, running: false };
}

// ===================== Sound =====================
const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
let audioCtx: AudioContext | null = null;
function ensureAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function playMoveSound() {
  try { const ctx = ensureAudioCtx(); const t = ctx.currentTime;
    const bufLen = Math.floor(ctx.sampleRate * 0.04); const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0); for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 3);
    const noise = ctx.createBufferSource(); noise.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 1.2;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.45, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    noise.connect(bp).connect(ng).connect(ctx.destination); noise.start(t); noise.stop(t + 0.06);
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(180, t); osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.35, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(og).connect(ctx.destination); osc.start(t); osc.stop(t + 0.1);
  } catch {}
}
function playCaptureSound() {
  try { const ctx = ensureAudioCtx(); const t = ctx.currentTime;
    const bufLen = Math.floor(ctx.sampleRate * 0.1); const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0); for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2);
    const noise = ctx.createBufferSource(); noise.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(2500, t); bp.frequency.exponentialRampToValueAtTime(600, t + 0.08); bp.Q.value = 1.5;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.5, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    noise.connect(bp).connect(ng).connect(ctx.destination); noise.start(t); noise.stop(t + 0.1);
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(300, t); osc.frequency.exponentialRampToValueAtTime(100, t + 0.06);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.5, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(og).connect(ctx.destination); osc.start(t); osc.stop(t + 0.08);
  } catch {}
}
function playCheckSound() {
  try { const ctx = ensureAudioCtx(); const t = ctx.currentTime;
    [880, 1100].forEach((freq, i) => { const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
      const g = ctx.createGain(); const start = t + i * 0.08; g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(0.3, start + 0.01); g.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      osc.connect(g).connect(ctx.destination); osc.start(start); osc.stop(start + 0.3); });
  } catch {}
}
function playCheckmateSound() {
  try { const ctx = ensureAudioCtx(); const t = ctx.currentTime;
    [440, 554, 660].forEach(freq => { const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.2, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(g).connect(ctx.destination); osc.start(t); osc.stop(t + 0.5); });
    [330, 392, 494].forEach(freq => { const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
      const g = ctx.createGain(); const start = t + 0.35; g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(0.25, start + 0.02); g.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
      osc.connect(g).connect(ctx.destination); osc.start(start); osc.stop(start + 0.6); });
  } catch {}
}
function playPromotionSound() {
  try { const ctx = ensureAudioCtx(); const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => { const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
      const g = ctx.createGain(); const start = t + i * 0.07; g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(0.25, start + 0.008); g.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(g).connect(ctx.destination); osc.start(start); osc.stop(start + 0.35); });
  } catch {}
}
function playIllegalSound() {
  try { const ctx = ensureAudioCtx(); const t = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(200, t); osc.frequency.exponentialRampToValueAtTime(120, t + 0.1);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(g).connect(ctx.destination); osc.start(t); osc.stop(t + 0.12);
  } catch {}
}
function playStalemateSound() {
  try { const ctx = ensureAudioCtx(); const t = ctx.currentTime;
    [440, 392, 349].forEach((freq, i) => { const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
      const g = ctx.createGain(); const start = t + i * 0.12; g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(0.2, start + 0.01); g.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(g).connect(ctx.destination); osc.start(start); osc.stop(start + 0.35); });
  } catch {}
}

// ===================== FEN/PGN =====================
function generateFEN(): string {
  let fen = '';
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      if (state.board[r][c] === EMPTY) { empty++; }
      else { if (empty > 0) { fen += empty; empty = 0; } const p = state.board[r][c]; fen += isWhite(p) ? PIECE_TYPE[p].toUpperCase() : PIECE_TYPE[p]; }
    }
    if (empty > 0) fen += empty;
    if (r < 7) fen += '/';
  }
  fen += ' ' + state.turn;
  let castling = '';
  if (state.castlingRights.wK) castling += 'K';
  if (state.castlingRights.wQ) castling += 'Q';
  if (state.castlingRights.bK) castling += 'k';
  if (state.castlingRights.bQ) castling += 'q';
  if (!castling) castling = '-';
  fen += ' ' + castling;
  fen += ' ' + (state.enPassantTarget ? rowColToFileRank(state.enPassantTarget.row, state.enPassantTarget.col) : '-');
  fen += ' ' + state.halfmoveClock;
  fen += ' ' + state.fullmoveNumber;
  return fen;
}

function generatePGN(): string {
  const result = state.gameOver ? (state.gameStatus === 'checkmate' ? (state.turn === 'w' ? '0-1' : '1-0') : '1/2-1/2') : '*';
  let pgn = `[Event "Chess Game"]\n[Site "Local"]\n[Date "${new Date().toISOString().slice(0, 10)}"]\n[Round "1"]\n[White "White"]\n[Black "Black"]\n[Result "${result}"]\n\n`;
  for (let i = 0; i < state.moveHistory.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    pgn += moveNum + '. ' + state.moveHistory[i] + (state.moveHistory[i + 1] ? ' ' + state.moveHistory[i + 1] : '') + (i % 2 === 1 ? '\n\n' : ' ');
  }
  pgn += result + '\n';
  return pgn;
}

// ===================== Stockfish =====================
let engine: Worker | null = null;
let engineReady = false;
let currentEngineRequest: null | 'analysis' | 'move' = null;
let pendingNewGame = false;
let engineMoveCandidates = new Map<number, { move: string; scoreCp: number | null }>();
const ENGINE_MOVE_DELAY_MIN_MS = 500;
const ENGINE_MOVE_DELAY_MAX_MS = 3000;
let engineMoveDelayTimer: ReturnType<typeof setTimeout> | null = null;

function clearPendingEngineMoveDelay() {
  if (!engineMoveDelayTimer) return;
  clearTimeout(engineMoveDelayTimer);
  engineMoveDelayTimer = null;
  state.lastEngineBestMove = null;
  lastEngineBestMoveRef.current = null;
}

function scheduleEngineMove(bestmoveStr: string) {
  clearPendingEngineMoveDelay();
  const delay = ENGINE_MOVE_DELAY_MIN_MS + Math.random() * (ENGINE_MOVE_DELAY_MAX_MS - ENGINE_MOVE_DELAY_MIN_MS);
  engineMoveDelayTimer = setTimeout(() => {
    engineMoveDelayTimer = null;
    if (!isEngineTurn() || state.gameOver) return;
    state.lastEngineBestMove = bestmoveStr;
    lastEngineBestMoveRef.current = bestmoveStr;
    renderTrigger.current();
  }, delay);
}

function initStockfish() {
  try {
    engine = new Worker('/stockfish.js', { type: 'classic' });
    engine.onmessage = (e) => handleEngineMessage(e.data);
    engine.onerror = () => { state.engineStatus = 'error'; engineStatusRef.current = 'error'; renderTrigger.current(); };
    engine.postMessage('uci');
  } catch { state.engineStatus = 'unavailable'; }
}

function handleEngineMessage(msg: string) {
  if (msg === 'uciok') { engine?.postMessage('isready'); return; }
  if (msg === 'readyok') {
    engineReady = true; state.engineStatus = 'ready';
    configureStrength();
    // Track that we just sent ucinewgame so bestmove handler knows to request first move
    if (!pendingNewGame) pendingNewGame = true;
    engine?.postMessage('ucinewgame');
    engineStatusRef.current = 'ready'; renderTrigger.current();
    startEngineTurnIfNeeded();
    return;
  }
  if (msg.startsWith('info')) {
    if (currentEngineRequest === 'move') parseEngineMoveCandidate(msg);
    if (msg.includes('score')) parseEvalInfo(msg);
    return;
  }
  if (msg.startsWith('bestmove')) { handleBestMove(msg); return; }
  if (msg && msg.startsWith('No such option:')) return;
}

function parseEngineMoveCandidate(msg: string) {
  const pvMatch = msg.match(/\bpv\s+([a-h][1-8][a-h][1-8][qrbn]?)/);
  if (!pvMatch) return;

  const multipvMatch = msg.match(/\bmultipv\s+(\d+)/);
  const index = multipvMatch ? parseInt(multipvMatch[1], 10) : 1;
  if (!Number.isFinite(index) || index < 1) return;
  engineMoveCandidates.set(index, { move: pvMatch[1], scoreCp: parseEngineScore(msg) });
}

function parseEngineScore(msg: string): number | null {
  const cpMatch = msg.match(/\bscore cp (-?\d+)/);
  if (cpMatch) return parseInt(cpMatch[1], 10);

  const mateMatch = msg.match(/\bscore mate (-?\d+)/);
  if (!mateMatch) return null;

  const mate = parseInt(mateMatch[1], 10);
  if (!Number.isFinite(mate)) return null;
  return Math.sign(mate) * (100_000 - Math.min(Math.abs(mate), 99) * 1_000);
}

function parseEvalInfo(msg: string) {
  const multipvMatch = msg.match(/multipv (\d+)/);
  if (multipvMatch && parseInt(multipvMatch[1], 10) !== 1) return;
  const sideToMove = state.turn;
  const cpMatch = msg.match(/score cp (-?\d+)/);
  const mateMatch = msg.match(/score mate (-?\d+)/);
  const hasLower = msg.includes('lowerbound');
  const hasUpper = msg.includes('upperbound');
  let newEval: EngineEval | null = null;
  if (cpMatch && !hasLower && !hasUpper) {
    newEval = { type: 'cp', whiteValue: sideToMove === 'w' ? parseInt(cpMatch[1], 10) : -parseInt(cpMatch[1], 10) };
  } else if (cpMatch && (hasLower || hasUpper) && (!state.engineEval || state.engineEval.type !== 'cp')) {
    newEval = { type: 'cp', whiteValue: sideToMove === 'w' ? parseInt(cpMatch[1], 10) : -parseInt(cpMatch[1], 10) };
  }
  if (mateMatch && !hasLower && !hasUpper) {
    newEval = { type: 'mate', whiteValue: sideToMove === 'w' ? parseInt(mateMatch[1], 10) : -parseInt(mateMatch[1], 10) };
  } else if (mateMatch && (hasLower || hasUpper) && (!state.engineEval || state.engineEval.type !== 'mate')) {
    newEval = { type: 'mate', whiteValue: sideToMove === 'w' ? parseInt(mateMatch[1], 10) : -parseInt(mateMatch[1], 10) };
  }
  if (newEval) { state.engineEval = newEval; engineEvalRef.current = newEval; renderTrigger.current(); }
}

function handleBestMove(msg: string) {
  const parts = msg.split(' ');
  const bestmoveStr = parts[1];

  // Handle the bestmove none that follows ucinewgame
  if (pendingNewGame && bestmoveStr === 'none') {
    pendingNewGame = false;
    // The engine finished ucinewgame, now request the first move if it's engine's turn
    startEngineTurnIfNeeded();
    return;
  }

  if (currentEngineRequest === 'move') {
    currentEngineRequest = null;
    if (bestmoveStr && bestmoveStr !== 'none') {
      scheduleEngineMove(bestmoveStr);
    } else {
      state.engineStatus = 'ready';
    }
    engineStatusRef.current = state.engineStatus; renderTrigger.current();
  } else if (currentEngineRequest === 'analysis') {
    currentEngineRequest = null;
    if (state.engineStatus === 'analyzing') { state.engineStatus = 'ready'; engineStatusRef.current = 'ready'; renderTrigger.current(); }
  }
}

function configureStrength() {
  if (!engine || !engineReady) return;
  const s = STRENGTH_MAP[state.strengthLevel];
  if (!s) return;
  engine.postMessage(`setoption name UCI_LimitStrength value ${s.uciElo ? 'true' : 'false'}`);
  if (s.uciElo) engine.postMessage(`setoption name UCI_Elo value ${s.uciElo}`);
  engine.postMessage(`setoption name Skill Level value ${s.skill}`);
  engine.postMessage(`setoption name MultiPV value ${s.candidateMoveCount}`);
}

function requestAnalysis() {
  if (!engine || !engineReady) return;
  if (currentEngineRequest) engine.postMessage('stop');
  currentEngineRequest = 'analysis';
  state.engineStatus = 'analyzing';
  engineStatusRef.current = 'analyzing';
  engine.postMessage('setoption name MultiPV value 1');
  engine.postMessage('position fen ' + generateFEN());
  engine.postMessage('go depth 12');
}

function requestEngineMove() {
  if (!engine || !engineReady) return;
  clearPendingEngineMoveDelay();
  if (currentEngineRequest) engine.postMessage('stop');
  const s = STRENGTH_MAP[state.strengthLevel];
  const movetime = s ? s.movetime : 500;
  engineMoveCandidates = new Map();
  currentEngineRequest = 'move';
  state.engineStatus = 'thinking';
  engineStatusRef.current = 'thinking';
  engine.postMessage(`setoption name MultiPV value ${s?.candidateMoveCount ?? 1}`);
  engine.postMessage('position fen ' + generateFEN());
  if (s?.searchDepth) engine.postMessage(`go depth ${s.searchDepth}`);
  else engine.postMessage(`go movetime ${movetime}`);
}

function isEngineTurn(): boolean {
  return (state.gameMode === 'hwe' && state.turn === 'b') || (state.gameMode === 'hbe' && state.turn === 'w');
}

function startEngineTurnIfNeeded() {
  if (!isEngineTurn() || state.gameOver) {
    return;
  }
  if (!engine || !engineReady) {
    return;
  }
  if (currentEngineRequest === 'move') return;
  requestEngineMove();
}

function parseUCIMove(str: string): ChessMove | null {
  if (str.length < 4) return null;
  return {
    from: { row: 8 - parseInt(str[1], 10), col: str.charCodeAt(0) - 97 },
    to: { row: 8 - parseInt(str[3], 10), col: str.charCodeAt(2) - 97 },
    promotion: str.length >= 5 && 'pqnbr'.includes(str[4].toLowerCase()) ? str[4].toLowerCase() : undefined,
  };
}

function resolveUCIMove(str: string): ChessMove | null {
  const parsed = parseUCIMove(str);
  if (!parsed) return null;

  const legalMove = getLegalMoves(parsed.from.row, parsed.from.col).find((move) =>
    move.to.row === parsed.to.row &&
    move.to.col === parsed.to.col &&
    move.promotion === parsed.promotion
  );

  return legalMove ?? null;
}

function chooseRandomLegalEngineMove(): ChessMove | null {
  const legalMoves = getAllLegalMoves(state.turn);
  if (legalMoves.length === 0) return null;
  return legalMoves[Math.floor(Math.random() * legalMoves.length)];
}

function chooseWeakenedEngineMove(bestmoveStr: string): ChessMove | null {
  const config = STRENGTH_MAP[state.strengthLevel];
  if (!config || config.candidateMoveCount <= 1) {
    return resolveUCIMove(bestmoveStr);
  }

  if (config.randomMoveChance > 0 && Math.random() < config.randomMoveChance) {
    return chooseRandomLegalEngineMove() ?? resolveUCIMove(bestmoveStr);
  }

  const candidates = Array.from(engineMoveCandidates.entries())
    .sort(([a], [b]) => a - b)
    .slice(0, config.candidateMoveCount)
    .map(([, candidate]) => candidate)
    .filter((candidate, index, moves) => moves.findIndex((move) => move.move === candidate.move) === index);

  if (candidates.length <= 1) return resolveUCIMove(bestmoveStr);

  const topScore = candidates[0].scoreCp;
  const acceptable = topScore === null
    ? candidates.slice(0, 1)
    : candidates.filter((candidate) =>
        candidate.scoreCp !== null &&
        topScore - candidate.scoreCp <= config.maxCandidateLossCp
      );

  const selected = acceptable[Math.floor(Math.random() * acceptable.length)]?.move ?? bestmoveStr;
  return resolveUCIMove(selected) ?? resolveUCIMove(bestmoveStr);
}

// ===================== Main Hook =====================
export interface UseChessGameReturn {
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
  castlingRights: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  gameMode: GameMode;
  strengthLevel: string;
  clock: ClockState;
  engineStatus: EngineStatus;
  engineEval: EngineEval | null;
  whiteName: string;
  blackName: string;
  lastEngineBestMove: string | null;
  retractsRemaining: number;
  retractUsed: boolean;
  canRetract: boolean;
  selectSquare: (row: number, col: number) => void;
  retractMove: () => boolean;
  resetGame: (timeControlMinutes?: number) => void;
  setGameMode: (mode: GameMode) => void;
  setStrength: (level: string) => void;
  setWhiteName: (name: string) => void;
  setBlackName: (name: string) => void;
  generatePGN: () => string;
  formatTime: (seconds: number) => string;
}

export function useChessGame(): UseChessGameReturn {
  const [clock, setClock] = useState<ClockState>({ whiteTime: 600, blackTime: 600, running: false });
  const [renderTick, setRenderTick] = useState(0);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('unavailable');
  const [engineEval, setEngineEval] = useState<EngineEval | null>(null);
  const [lastEngineBestMove, setLastEngineBestMove] = useState<string | null>(null);

  // Wire render trigger
  useEffect(() => { renderTrigger.current = () => setRenderTick(r => r + 1); }, []);

  // Sync refs to React state
  useEffect(() => { setClock(clockRef.current); }, [renderTick]);
  useEffect(() => { setEngineStatus(engineStatusRef.current); }, [renderTick]);
  useEffect(() => { setEngineEval(engineEvalRef.current); }, [renderTick]);
  useEffect(() => { setLastEngineBestMove(lastEngineBestMoveRef.current); }, [renderTick]);

  // Init
  useEffect(() => {
    state.board = initBoard();
    setEnPassantTarget(null);
    initStockfish();
  }, []);

  // Execute engine move when bestmove arrives
  useEffect(() => {
    if (!lastEngineBestMove) return;
    const isEngineTurn = (state.gameMode === 'hwe' && state.turn === 'b') || (state.gameMode === 'hbe' && state.turn === 'w');
    if (!isEngineTurn) return;
    const move = chooseWeakenedEngineMove(lastEngineBestMove);
    state.engineStatus = 'ready';
    engineStatusRef.current = 'ready';
    if (move) executeMove(move);
    state.lastEngineBestMove = null;
    lastEngineBestMoveRef.current = null;
  }, [lastEngineBestMove]);

  const selectSquare = useCallback((row: number, col: number) => {
    if (state.gameOver) return;
    const isEngineTurn = (state.gameMode === 'hwe' && state.turn === 'b') || (state.gameMode === 'hbe' && state.turn === 'w');
    if (isEngineTurn) return;

    const piece = state.board[row][col];

    if (state.selectedSquare && state.legalMovesForSelected.some(m => m.to.row === row && m.to.col === col)) {
      const move = state.legalMovesForSelected.find(m => m.to.row === row && m.to.col === col);
      if (move) {
        if (isHumanTurnInStockfishMode()) {
          state.retractSnapshots.push(createSnapshot());
        }
        executeMove(move);
      }
      return;
    }

    if (piece !== EMPTY && colorOf(piece) === state.turn) {
      state.selectedSquare = { row, col };
      state.legalMovesForSelected = getLegalMoves(row, col);
      renderTrigger.current();
      return;
    }

    if (state.selectedSquare) playIllegalSound();
    state.selectedSquare = null;
    state.legalMovesForSelected = [];
    renderTrigger.current();
  }, []);

  const resetGame = useCallback((timeControlMinutes: number = 10) => {
    resetState(timeControlMinutes);
    configurePlayerNames();
    if (engine && engineReady) engine.postMessage('ucinewgame');
    startEngineTurnIfNeeded();
    renderTrigger.current();
  }, []);

  const setGameMode = useCallback((mode: GameMode) => {
    state.gameMode = mode;
    resetState();
    configurePlayerNames();
    startEngineTurnIfNeeded();
    renderTrigger.current();
  }, []);

  const setStrength = useCallback((level: string) => {
    state.strengthLevel = level;
    configureStrength();
    renderTrigger.current();
  }, []);

  const setWhiteName = useCallback((name: string) => { state.whiteName = name; renderTrigger.current(); }, []);
  const setBlackName = useCallback((name: string) => { state.blackName = name; renderTrigger.current(); }, []);

  const retractMove = useCallback(() => retractHumanStockfishMove(), []);

  const formatTime = useCallback((seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  return {
    board: state.board,
    turn: state.turn,
    selectedSquare: state.selectedSquare,
    legalMovesForSelected: state.legalMovesForSelected,
    lastMove: state.lastMove,
    moveHistory: state.moveHistory,
    capturedByWhite: state.capturedByWhite,
    capturedByBlack: state.capturedByBlack,
    gameOver: state.gameOver,
    gameStatus: state.gameStatus,
    enPassantTarget: state.enPassantTarget,
    castlingRights: state.castlingRights,
    gameMode: state.gameMode,
    strengthLevel: state.strengthLevel,
    clock,
    engineStatus,
    engineEval,
    whiteName: state.whiteName,
    blackName: state.blackName,
    lastEngineBestMove,
    retractsRemaining: Math.max(0, MAX_STOCKFISH_RETRACTS - state.retractCount),
    retractUsed: state.retractUsed,
    canRetract: isStockfishMode() && state.retractCount < MAX_STOCKFISH_RETRACTS && state.retractSnapshots.length > 0,
    selectSquare,
    retractMove,
    resetGame,
    setGameMode,
    setStrength,
    setWhiteName,
    setBlackName,
    generatePGN,
    formatTime,
  };
}

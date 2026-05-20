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
  gameMode: 'hvh' as GameMode,
  strengthLevel: 'beginner',
  whiteName: 'You',
  blackName: 'Stockfish',
  engineStatus: 'unavailable' as EngineStatus,
  engineEval: null as EngineEval | null,
  lastEngineBestMove: null as string | null,
};

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
  state.enPassantTarget = null;
  state.castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
  state.halfmoveClock = 0;
  state.fullmoveNumber = 1;
  state.engineEval = null;
  state.lastEngineBestMove = null;
  clockRunning = false;
  if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
  whiteTime = timeControlMinutes * 60;
  blackTime = timeControlMinutes * 60;
  clockRef.current = { whiteTime, blackTime, running: false };
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
      if (color === 'w' && state.castlingRights.wK && state.board[7][5] === EMPTY && state.board[7][6] === EMPTY && !isSquareAttackedBy(7, 5, enemy) && !isSquareAttackedBy(7, 6, enemy))
        pseudo.push({ from: { row, col }, to: { row: 7, col: 6 }, castle: 'K' });
      if (color === 'w' && state.castlingRights.wQ && state.board[7][1] === EMPTY && state.board[7][2] === EMPTY && state.board[7][3] === EMPTY && !isSquareAttackedBy(7, 3, enemy) && !isSquareAttackedBy(7, 2, enemy))
        pseudo.push({ from: { row, col }, to: { row: 7, col: 2 }, castle: 'Q' });
      if (color === 'b' && state.castlingRights.bK && state.board[0][5] === EMPTY && state.board[0][6] === EMPTY && !isSquareAttackedBy(0, 5, enemy) && !isSquareAttackedBy(0, 6, enemy))
        pseudo.push({ from: { row, col }, to: { row: 0, col: 6 }, castle: 'K' });
      if (color === 'b' && state.castlingRights.bQ && state.board[0][1] === EMPTY && state.board[0][2] === EMPTY && state.board[0][3] === EMPTY && !isSquareAttackedBy(0, 3, enemy) && !isSquareAttackedBy(0, 2, enemy))
        pseudo.push({ from: { row, col }, to: { row: 0, col: 2 }, castle: 'Q' });
    }
  }

  const legal: ChessMove[] = [];
  for (const move of pseudo) {
    const savedBoard = state.board.map(r => [...r]);
    const savedEP = enPassantTarget;
    const savedCR = { ...state.castlingRights };
    applyMoveToBoard(move);
    if (!isInCheck(color)) legal.push(move);
    state.board = savedBoard;
    enPassantTarget = savedEP;
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
  enPassantTarget = null;
  if (PIECE_TYPE[piece] === 'p' && Math.abs(move.to.row - move.from.row) === 2) {
    enPassantTarget = { row: (move.from.row + move.to.row) / 2, col: move.from.col };
  }
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

  let notation = '';
  const fromSq = rowColToFileRank(move.from.row, move.from.col);
  const toSq = rowColToFileRank(move.to.row, move.to.col);
  if (move.castle === 'K') notation = 'O-O';
  else if (move.castle === 'Q') notation = 'O-O-O';
  else {
    const pType = PIECE_TYPE[piece];
    if (pType !== 'p') notation += pType.toUpperCase();
    if (captured !== EMPTY || move.enPassant) {
      if (pType === 'p') notation += FILES[move.from.col];
      notation += 'x';
    }
    notation += toSq;
    if (move.promotion) notation += '=' + move.promotion.toUpperCase();
  }

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

  // Stockfish
  requestAnalysis();
  if (!state.gameOver && ((state.gameMode === 'hwe' && state.turn === 'b') || (state.gameMode === 'hbe' && state.turn === 'w'))) {
    requestEngineMove();
  }
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

function initStockfish() {
  try {
    engine = new Worker(new URL('/stockfish.js', import.meta.url), { type: 'classic' });
    engine.onmessage = (e) => handleEngineMessage(e.data);
    engine.onerror = () => { state.engineStatus = 'error'; engineStatusRef.current = 'error'; renderTrigger.current(); };
    engine.postMessage('uci');
  } catch { state.engineStatus = 'unavailable'; }
}

function handleEngineMessage(msg: string) {
  if (msg === 'uciok') { engine?.postMessage('isready'); return; }
  if (msg === 'readyok') {
    engineReady = true; state.engineStatus = 'ready';
    configureStrength(); engine?.postMessage('ucinewgame');
    engineStatusRef.current = 'ready'; renderTrigger.current();
    return;
  }
  if (msg.startsWith('info') && msg.includes('score')) { parseEvalInfo(msg); return; }
  if (msg.startsWith('bestmove')) { handleBestMove(msg); return; }
  if (msg && msg.startsWith('No such option:')) return;
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
  if (currentEngineRequest === 'move') {
    currentEngineRequest = null;
    state.engineStatus = 'ready';
    if (bestmoveStr && bestmoveStr !== 'none') {
      state.lastEngineBestMove = bestmoveStr;
      lastEngineBestMoveRef.current = bestmoveStr;
    }
    engineStatusRef.current = 'ready'; renderTrigger.current();
  } else if (currentEngineRequest === 'analysis') {
    currentEngineRequest = null;
    if (state.engineStatus === 'analyzing') { state.engineStatus = 'ready'; engineStatusRef.current = 'ready'; renderTrigger.current(); }
  }
}

function configureStrength() {
  if (!engine || !engineReady) return;
  const s = STRENGTH_MAP[state.strengthLevel];
  if (!s) return;
  engine.postMessage('setoption name UCI_LimitStrength value true');
  engine.postMessage(`setoption name UCI_Elo value ${s.elo}`);
  engine.postMessage(`setoption name Skill Level value ${s.skill}`);
}

function requestAnalysis() {
  if (!engine || !engineReady) return;
  if (currentEngineRequest) engine.postMessage('stop');
  currentEngineRequest = 'analysis';
  state.engineStatus = 'analyzing';
  engineStatusRef.current = 'analyzing';
  engine.postMessage('position fen ' + generateFEN());
  engine.postMessage('go depth 12');
}

function requestEngineMove() {
  if (!engine || !engineReady) return;
  if (currentEngineRequest) engine.postMessage('stop');
  const s = STRENGTH_MAP[state.strengthLevel];
  const movetime = s ? s.movetime : 500;
  currentEngineRequest = 'move';
  state.engineStatus = 'thinking';
  engineStatusRef.current = 'thinking';
  engine.postMessage('position fen ' + generateFEN());
  engine.postMessage(`go movetime ${movetime}`);
}

function parseUCIMove(str: string): ChessMove | null {
  if (str.length < 4) return null;
  return {
    from: { row: 8 - parseInt(str[1], 10), col: str.charCodeAt(0) - 97 },
    to: { row: 8 - parseInt(str[3], 10), col: str.charCodeAt(2) - 97 },
    promotion: str.length >= 5 && 'pqnbr'.includes(str[4].toLowerCase()) ? str[4].toLowerCase() : undefined,
  };
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
  selectSquare: (row: number, col: number) => void;
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
    initStockfish();
  }, []);

  // Execute engine move when bestmove arrives
  useEffect(() => {
    if (!lastEngineBestMove) return;
    const isEngineTurn = (state.gameMode === 'hwe' && state.turn === 'b') || (state.gameMode === 'hbe' && state.turn === 'w');
    if (!isEngineTurn) return;
    const move = parseUCIMove(lastEngineBestMove);
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
      if (move) executeMove(move);
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
    if (engine && engineReady) engine.postMessage('ucinewgame');
    renderTrigger.current();
  }, []);

  const setGameMode = useCallback((mode: GameMode) => {
    state.gameMode = mode;
    resetState();
    renderTrigger.current();
  }, []);

  const setStrength = useCallback((level: string) => {
    state.strengthLevel = level;
    configureStrength();
    renderTrigger.current();
  }, []);

  const setWhiteName = useCallback((name: string) => { state.whiteName = name; renderTrigger.current(); }, []);
  const setBlackName = useCallback((name: string) => { state.blackName = name; renderTrigger.current(); }, []);

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
    selectSquare,
    resetGame,
    setGameMode,
    setStrength,
    setWhiteName,
    setBlackName,
    generatePGN,
    formatTime,
  };
}

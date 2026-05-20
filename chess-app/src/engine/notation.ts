import {
  EMPTY, PIECE_TYPE, FILES, RANKS,
  isWhite, Coord, ChessMove,
} from './types';
import type { GameContext } from './logic';

// ===================== FEN Generation =====================
export function generateFEN(state: GameContext): string {
  let fen = '';
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      if (state.board[r][c] === EMPTY) {
        empty++;
      } else {
        if (empty > 0) { fen += empty; empty = 0; }
        const p = state.board[r][c];
        const t = PIECE_TYPE[p];
        fen += isWhite(p) ? t.toUpperCase() : t;
      }
    }
    if (empty > 0) fen += empty;
    if (r < 7) fen += '/';
  }
  fen += ' ' + state.turn;

  // Castling
  let castling = '';
  if (state.castlingRights.wK) castling += 'K';
  if (state.castlingRights.wQ) castling += 'Q';
  if (state.castlingRights.bK) castling += 'k';
  if (state.castlingRights.bQ) castling += 'q';
  if (!castling) castling = '-';
  fen += ' ' + castling;

  // En passant
  if (state.enPassantTarget) {
    fen += ' ' + rowColToFileRank(state.enPassantTarget.row, state.enPassantTarget.col);
  } else {
    fen += ' -';
  }

  fen += ' ' + state.halfmoveClock;
  fen += ' ' + state.fullmoveNumber;

  return fen;
}

function rowColToFileRank(row: number, col: number): string {
  return FILES[col] + RANKS[row];
}

// ===================== PGN Generation =====================
export function generatePGN(state: GameContext): string {
  const result = getResultString(state);
  let pgn = '';

  // Header tags
  pgn += '[Event "Chess Game"]\n';
  pgn += '[Site "Local"]\n';
  pgn += '[Date "' + new Date().toISOString().slice(0, 10) + '"]\n';
  pgn += '[Round "1"]\n';
  pgn += '[White "' + (state.turn === 'w' ? 'Black' : 'White') + '"]\n';
  pgn += '[Black "' + (state.turn === 'w' ? 'White' : 'Black') + '"]\n';
  pgn += '[Result "' + result + '"]\n';
  pgn += '\n';

  // Moves
  for (let i = 0; i < state.moveHistory.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    pgn += moveNum + '. ' + state.moveHistory[i];
    if (state.moveHistory[i + 1]) {
      pgn += ' ' + state.moveHistory[i + 1];
    }
    pgn += i % 2 === 1 ? '\n\n' : ' ';
  }

  pgn += result + '\n';
  return pgn;
}

function getResultString(state: GameContext): string {
  if (state.gameStatus === 'checkmate') {
    return state.turn === 'w' ? '0-1' : '1-0';
  }
  if (state.gameStatus === 'stalemate' ||
      state.gameStatus === 'white_time_win' ||
      state.gameStatus === 'black_time_win') {
    return '1/2-1/2';
  }
  return '*';
}

// ===================== Parse UCI Move =====================
export function parseUCIMove(str: string): ChessMove | null {
  if (str.length < 4) return null;
  const from = fileRankToRowCol(str.substring(0, 2));
  const to = fileRankToRowCol(str.substring(2, 4));
  let promotion: string | undefined;
  if (str.length >= 5) {
    const promoChar = str[4].toLowerCase();
    if ('pqnbr'.includes(promoChar)) {
      promotion = promoChar;
    }
  }
  return { from, to, promotion };
}

function fileRankToRowCol(sq: string): Coord {
  const f = sq.charCodeAt(0) - 97;
  const r = 8 - parseInt(sq[1], 10);
  return { row: r, col: f };
}

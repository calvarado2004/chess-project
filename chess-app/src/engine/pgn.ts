// ===================== PGN Parser =====================
// Minimal PGN parser: extracts headers and SAN move list

import {
  EMPTY, W_PAWN, W_KNIGHT, W_BISHOP, W_ROOK, W_QUEEN, W_KING,
  B_PAWN, B_KNIGHT, B_BISHOP, B_ROOK, B_QUEEN, B_KING,
  PIECE_TYPE, colorOf, isWhite, initBoard,
} from './index';

export interface PGNHeader {
  [tag: string]: string;
}

export interface ParsedPGN {
  headers: PGNHeader;
  moves: string[];  // SAN moves in order
  result: string;
}

/**
 * Parse a PGN string into headers and moves.
 * Handles standard PGN format with [Tag "Value"] headers and SAN moves.
 */
export function parsePGN(pgn: string): ParsedPGN {
  const headers: PGNHeader = {};
  const moves: string[] = [];
  let result = '*';

  const lines = pgn.split(/\r?\n/);
  let inHeaders = true;
  let moveText = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Header line
    if (inHeaders) {
      const headerMatch = trimmed.match(/^\[(\w+)\s+"(.*)"\]$/);
      if (headerMatch) {
        headers[headerMatch[1]] = headerMatch[2];
        continue;
      }
      // First non-header line ends headers
      inHeaders = false;
    }

    // Collect move text
    if (trimmed && !trimmed.startsWith('%')) {
      moveText += ' ' + trimmed;
    }
  }

  // Parse move text into individual SAN moves
  // Remove result token at the end (1-0, 0-1, 1/2-1/2, *)
  const resultTokens = ['1-0', '0-1', '1/2-1/2', '*'];
  for (const token of resultTokens) {
    if (moveText.trim().endsWith(token)) {
      result = token;
      moveText = moveText.trim().slice(0, -token.length).trim();
      break;
    }
  }

  // Remove move numbers (e.g., "1. ", "23...")
  // Remove annotation symbols ({...}, (...), △, ◇, ⊕, etc.)
  // Remove NAGs ($1, $2, etc.)
  let cleaned = moveText
    // Remove annotations in braces
    .replace(/\{[^}]*\}/g, '')
    // Remove annotations in parentheses
    .replace(/\([^)]*\)/g, '')
    // Remove NAGs
    .replace(/\$\d+/g, '')
    // Remove geometric diagrams and other symbols
    .replace(/[△◇⊕♔♕♖♗♘♙♚♛♜♝♞♟]/g, '')
    // Remove move numbers
    .replace(/\d+\.\.\s*/g, ' ')
    .replace(/\d+\.\s*/g, ' ');

  // Split into tokens and filter
  const tokens = cleaned.split(/\s+/).filter(t => t.length > 0);

  // Parse SAN moves, handling variations (...) and split lines
  for (const token of tokens) {
    if (token === '' || token === '...') continue;

    // Handle split lines (e.g., "e4\ne5" on separate visual lines joined)
    // These are already separate tokens, so we just add them
    moves.push(token);
  }

  return { headers, moves, result };
}

/**
 * Replay a list of SAN moves from the starting position.
 * Returns the board state and metadata at each step.
 */
export function replayMovesFromPGN(moves: string[]): {
  board: number[][];
  turn: 'w' | 'b';
  moveHistory: string[];
  gameOver: boolean;
  gameStatus: string;
  castlingRights: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  enPassantTarget: { row: number; col: number } | null;
  lastMove: { from: { row: number; col: number }; to: { row: number; col: number } } | null;
} {
  const board = initBoard();
  let turn: 'w' | 'b' = 'w';
  const moveHistory: string[] = [];
  let gameOver = false;
  let gameStatus = 'normal';
  const castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
  let enPassantTarget: { row: number; col: number } | null = null;
  let lastMove: { from: { row: number; col: number }; to: { row: number; col: number } } | null = null;

  for (const san of moves) {
    const move = parseSANMove(board, san, turn, castlingRights, enPassantTarget);
    if (!move) continue;

    const moveCoords = { from: { row: move.fromRow, col: move.fromCol }, to: { row: move.toRow, col: move.toCol } };
    applyMoveToBoard(board, move, castlingRights, enPassantTarget);
    lastMove = moveCoords;
    moveHistory.push(san);
    turn = turn === 'w' ? 'b' : 'w';
  }

  return { board, turn, moveHistory, gameOver, gameStatus, castlingRights, enPassantTarget, lastMove };
}

// ===================== SAN Move Parsing =====================

interface SANMove {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  promotion?: string;
  castle?: 'K' | 'Q';
  capture: boolean;
  disambiguation?: string; // file or rank char to disambiguate
}

function parseSANMove(
  board: number[][],
  san: string,
  turn: 'w' | 'b',
  castlingRights: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean },
  epTarget: { row: number; col: number } | null
): SANMove | null {
  const pieceIsWhite = turn === 'w';

  // Castling
  if (san === 'O-O' || san === '0-0') {
    const row = pieceIsWhite ? 7 : 0;
    return { fromRow: row, fromCol: 4, toRow: row, toCol: 6, capture: false, castle: 'K' };
  }
  if (san === 'O-O-O' || san === '0-0-0') {
    const row = pieceIsWhite ? 7 : 0;
    return { fromRow: row, fromCol: 4, toRow: row, toCol: 2, capture: false, castle: 'Q' };
  }

  // Normal move: parse piece, disambiguation, capture, destination, promotion
  let rest = san.replace(/[+#]/g, ''); // Remove check/mate symbols
  let promotion: string | undefined;
  let capture = false;

  // Promotion
  const promoMatch = rest.match(/=[QRRBNN]/i);
  if (promoMatch) {
    promotion = promoMatch[0].charAt(1).toLowerCase();
    rest = rest.substring(0, promoMatch.index);
  }

  // Capture
  if (rest.includes('x')) {
    capture = true;
    rest = rest.replace('x', '');
  }

  // Destination square (last 2 chars)
  const toSq = rest.slice(-2);
  const toCol = toSq.charCodeAt(0) - 97;
  const toRow = 8 - parseInt(toSq[1], 10);
  rest = rest.slice(0, -2);

  // Piece type (first char, or pawn if empty)
  let pieceType = 'p';
  let offset = 0;
  let sourceFile: number | null = null;
  if (rest.length > 0 && 'KNBRQ'.includes(rest[0].toUpperCase())) {
    pieceType = rest[0].toLowerCase();
    offset = 1;
  } else if (rest.length > 0 && 'abcdefgh'.includes(rest[0])) {
    // Pawn move with source file specified (e.g. "d4" means pawn on d-file moves to d4)
    // The first char is the source file, not a piece type.
    pieceType = 'p';
    sourceFile = rest.charCodeAt(0) - 97;
    // Reset rest to empty since the entire string was just the destination
    rest = '';
  }

  // Disambiguation (remaining chars between piece and destination)
  const disambig = rest.slice(offset);

  // Find the piece
  const pieceValue = pieceIsWhite
    ? { p: W_PAWN, n: W_KNIGHT, b: W_BISHOP, r: W_ROOK, q: W_QUEEN, k: W_KING }[pieceType]!
    : { p: B_PAWN, n: B_KNIGHT, b: B_BISHOP, r: B_ROOK, q: B_QUEEN, k: B_KING }[pieceType]!;

  let fromRow = -1;
  let fromCol = -1;

  // Search for matching piece
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] !== pieceValue) continue;
      if (colorOf(board[r][c]) !== turn) continue;

      // Apply disambiguation filters
      let matches = true;
      // Source file from pawn move (e.g. "d4" → pawn on d-file)
      if (sourceFile !== null && c !== sourceFile) {
        matches = false;
      }
      // File disambiguation (e.g. "Rdxe4" → R on d-file)
      if (disambig.includes('a') || disambig.includes('b') || disambig.includes('c') ||
          disambig.includes('d') || disambig.includes('e') || disambig.includes('f') ||
          disambig.includes('g') || disambig.includes('h')) {
        const expectedCol = disambig.charCodeAt(0) - 97;
        if (c !== expectedCol) matches = false;
      }
      // Rank disambiguation (e.g. "R1e4" → R on 1st rank)
      if (disambig.match(/\d/)) {
        const expectedRow = 8 - parseInt(disambig, 10);
        if (r !== expectedRow) matches = false;
      }

      if (matches && toRow >= 0 && toRow < 8 && toCol >= 0 && toCol < 8) {
        // Check if destination is valid (empty or enemy)
        const destPiece = board[toRow][toCol];
        if (destPiece === EMPTY || colorOf(destPiece) !== turn) {
          fromRow = r;
          fromCol = c;
          break;
        }
      }
    }
    if (fromRow >= 0) break;
  }

  if (fromRow < 0) return null;

  return { fromRow, fromCol, toRow, toCol, promotion, capture, disambiguation: disambig || undefined };
}

function applyMoveToBoard(
  board: number[][],
  move: SANMove,
  castlingRights: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean },
  epTarget: { row: number; col: number } | null
): void {
  const piece = board[move.fromRow][move.fromCol];
  const pieceIsWhite = isWhite(piece);

  // En passant capture
  if (move.capture && PIECE_TYPE[piece] === 'p' && move.fromCol !== move.toCol && board[move.toRow][move.toCol] === EMPTY) {
    // En passant — remove the captured pawn
    const capturedRow = pieceIsWhite ? move.toRow + 1 : move.toRow - 1;
    board[capturedRow][move.toCol] = EMPTY;
  }

  // Move piece
  board[move.toRow][move.toCol] = piece;
  board[move.fromRow][move.fromCol] = EMPTY;

  // Castling rook move
  if (move.castle === 'K') {
    const row = move.toRow;
    board[row][5] = board[row][7];
    board[row][7] = EMPTY;
  } else if (move.castle === 'Q') {
    const row = move.toRow;
    board[row][3] = board[row][0];
    board[row][0] = EMPTY;
  }

  // Promotion
  if (move.promotion) {
    const promoValue = pieceIsWhite
      ? { q: W_QUEEN, r: W_ROOK, b: W_BISHOP, n: W_KNIGHT }[move.promotion]!
      : { q: B_QUEEN, r: B_ROOK, b: B_BISHOP, n: B_KNIGHT }[move.promotion]!;
    board[move.toRow][move.toCol] = promoValue;
  }

  // Update castling rights
  if (PIECE_TYPE[piece] === 'k') {
    if (pieceIsWhite) { castlingRights.wK = false; castlingRights.wQ = false; }
    else { castlingRights.bK = false; castlingRights.bQ = false; }
  }
  if (PIECE_TYPE[piece] === 'r') {
    if (move.fromRow === 7 && move.fromCol === 0) castlingRights.wQ = false;
    if (move.fromRow === 7 && move.fromCol === 7) castlingRights.wK = false;
    if (move.fromRow === 0 && move.fromCol === 0) castlingRights.bQ = false;
    if (move.fromRow === 0 && move.fromCol === 7) castlingRights.bK = false;
  }
  // If a rook is captured on its starting square
  if (move.toRow === 7 && move.toCol === 0) castlingRights.wQ = false;
  if (move.toRow === 7 && move.toCol === 7) castlingRights.wK = false;
  if (move.toRow === 0 && move.toCol === 0) castlingRights.bQ = false;
  if (move.toRow === 0 && move.toCol === 7) castlingRights.bK = false;

  // Update en passant target
  if (PIECE_TYPE[piece] === 'p' && Math.abs(move.toRow - move.fromRow) === 2) {
    epTarget = { row: (move.fromRow + move.toRow) / 2, col: move.fromCol };
  } else {
    epTarget = null;
  }
}

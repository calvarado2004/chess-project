import { EMPTY, PIECE_TYPE, FILES, RANKS, isWhite, } from './types.js';
// ===================== FEN Generation =====================
export function generateFEN(board, turn, castlingRights, enPassantTarget, halfmoveClock, fullmoveNumber) {
    let fen = '';
    for (let r = 0; r < 8; r++) {
        let empty = 0;
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === EMPTY) {
                empty++;
            }
            else {
                if (empty > 0) {
                    fen += empty;
                    empty = 0;
                }
                const p = board[r][c];
                const t = PIECE_TYPE[p];
                fen += isWhite(p) ? t.toUpperCase() : t;
            }
        }
        if (empty > 0)
            fen += empty;
        if (r < 7)
            fen += '/';
    }
    fen += ' ' + turn;
    // Castling
    let castling = '';
    if (castlingRights.wK)
        castling += 'K';
    if (castlingRights.wQ)
        castling += 'Q';
    if (castlingRights.bK)
        castling += 'k';
    if (castlingRights.bQ)
        castling += 'q';
    if (!castling)
        castling = '-';
    fen += ' ' + castling;
    // En passant
    if (enPassantTarget) {
        fen += ' ' + rowColToFileRank(enPassantTarget.row, enPassantTarget.col);
    }
    else {
        fen += ' -';
    }
    fen += ' ' + halfmoveClock;
    fen += ' ' + fullmoveNumber;
    return fen;
}
function rowColToFileRank(row, col) {
    return FILES[col] + RANKS[row];
}
// ===================== Parse UCI Move =====================
export function parseUCIMove(str) {
    if (str.length < 4)
        return null;
    const from = fileRankToRowCol(str.substring(0, 2));
    const to = fileRankToRowCol(str.substring(2, 4));
    let promotion;
    if (str.length >= 5) {
        const promoChar = str[4].toLowerCase();
        if ('pqnbr'.includes(promoChar)) {
            promotion = promoChar;
        }
    }
    return { from, to, promotion };
}
function fileRankToRowCol(sq) {
    const f = sq.charCodeAt(0) - 97;
    const r = 8 - parseInt(sq[1], 10);
    return { row: r, col: f };
}
//# sourceMappingURL=notation.js.map
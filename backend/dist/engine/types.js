// ===================== Piece IDs =====================
export const EMPTY = 0;
export const W_PAWN = 1, W_KNIGHT = 2, W_BISHOP = 3, W_ROOK = 4, W_QUEEN = 5, W_KING = 6;
export const B_PAWN = 7, B_KNIGHT = 8, B_BISHOP = 9, B_ROOK = 10, B_QUEEN = 11, B_KING = 12;
// ===================== Piece Unicode (not used on server, but kept for parity) =====================
export const PIECE_UNICODE = {
    [W_KING]: '\u265A', [W_QUEEN]: '\u265B', [W_ROOK]: '\u265C',
    [W_BISHOP]: '\u265D', [W_KNIGHT]: '\u265E', [W_PAWN]: '\u265F',
    [B_KING]: '\u265A', [B_QUEEN]: '\u265B', [B_ROOK]: '\u265C',
    [B_BISHOP]: '\u265D', [B_KNIGHT]: '\u265E', [B_PAWN]: '\u265F',
};
export const PIECE_TYPE = {
    [W_PAWN]: 'p', [W_KNIGHT]: 'n', [W_BISHOP]: 'b', [W_ROOK]: 'r', [W_QUEEN]: 'q', [W_KING]: 'k',
    [B_PAWN]: 'p', [B_KNIGHT]: 'n', [B_BISHOP]: 'b', [B_ROOK]: 'r', [B_QUEEN]: 'q', [B_KING]: 'k',
};
export const PIECE_VALUE = {
    [W_PAWN]: 1, [W_KNIGHT]: 3, [W_BISHOP]: 3, [W_ROOK]: 5, [W_QUEEN]: 9, [W_KING]: 0,
    [B_PAWN]: 1, [B_KNIGHT]: 3, [B_BISHOP]: 3, [B_ROOK]: 5, [B_QUEEN]: 9, [B_KING]: 0,
};
// ===================== Helpers =====================
export function isWhite(p) { return p >= W_PAWN && p <= W_KING; }
export function isBlack(p) { return p >= B_PAWN && p <= B_KING; }
export function colorOf(p) {
    if (isWhite(p))
        return 'w';
    if (isBlack(p))
        return 'b';
    return null;
}
export function isFriendly(p, c) { return c === 'w' ? isWhite(p) : isBlack(p); }
export function isEnemy(p, c) { return c === 'w' ? isBlack(p) : isWhite(p); }
// ===================== Coordinates =====================
export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];
export function rowColToFileRank(row, col) {
    return FILES[col] + RANKS[row];
}
export function fileRankToRowCol(sq) {
    const f = sq.charCodeAt(0) - 97;
    const r = 8 - parseInt(sq[1], 10);
    return { row: r, col: f };
}
//# sourceMappingURL=types.js.map
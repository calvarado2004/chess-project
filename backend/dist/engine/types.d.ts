export declare const EMPTY = 0;
export declare const W_PAWN = 1, W_KNIGHT = 2, W_BISHOP = 3, W_ROOK = 4, W_QUEEN = 5, W_KING = 6;
export declare const B_PAWN = 7, B_KNIGHT = 8, B_BISHOP = 9, B_ROOK = 10, B_QUEEN = 11, B_KING = 12;
export declare const PIECE_UNICODE: Record<number, string>;
export declare const PIECE_TYPE: Record<number, string>;
export declare const PIECE_VALUE: Record<number, number>;
export declare function isWhite(p: number): boolean;
export declare function isBlack(p: number): boolean;
export declare function colorOf(p: number): 'w' | 'b' | null;
export declare function isFriendly(p: number, c: 'w' | 'b'): boolean;
export declare function isEnemy(p: number, c: 'w' | 'b'): boolean;
export declare const FILES: readonly ["a", "b", "c", "d", "e", "f", "g", "h"];
export declare const RANKS: readonly ["8", "7", "6", "5", "4", "3", "2", "1"];
export interface Coord {
    row: number;
    col: number;
}
export declare function rowColToFileRank(row: number, col: number): string;
export declare function fileRankToRowCol(sq: string): Coord;
export interface ChessMove {
    from: Coord;
    to: Coord;
    promotion?: string;
    castle?: 'K' | 'Q';
    enPassant?: boolean;
}
export type GameStatus = 'normal' | 'check' | 'checkmate' | 'stalemate' | 'white_time_win' | 'black_time_win';
export interface CastlingRights {
    wK: boolean;
    wQ: boolean;
    bK: boolean;
    bQ: boolean;
}
export type GameMode = 'hvh' | 'hwe' | 'hbe' | 'online';
//# sourceMappingURL=types.d.ts.map
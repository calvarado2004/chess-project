import { Coord, ChessMove } from './types.js';
export declare function generateFEN(board: number[][], turn: 'w' | 'b', castlingRights: {
    wK: boolean;
    wQ: boolean;
    bK: boolean;
    bQ: boolean;
}, enPassantTarget: Coord | null, halfmoveClock: number, fullmoveNumber: number): string;
export declare function parseUCIMove(str: string): ChessMove | null;
//# sourceMappingURL=notation.d.ts.map
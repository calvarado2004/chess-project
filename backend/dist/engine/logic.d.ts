import { CastlingRights, ChessMove, Coord, GameStatus } from './types.js';
export declare function createEmptyBoard(): number[][];
export declare function initBoard(): number[][];
export declare function isSquareAttackedBy(board: number[][], row: number, col: number, byColor: 'w' | 'b'): boolean;
export declare function findKing(board: number[][], color: 'w' | 'b'): Coord | null;
export declare function isInCheck(board: number[][], color: 'w' | 'b'): boolean;
export declare function pseudoLegalMoves(board: number[][], row: number, col: number): ChessMove[];
export declare function applyMoveToBoard(board: number[][], move: ChessMove): number;
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
export declare function createInitialState(): GameContext;
export declare function cloneState(state: GameContext): GameContext;
export declare function getLegalMoves(state: GameContext, row: number, col: number): ChessMove[];
export declare function getAllLegalMoves(state: GameContext, color: 'w' | 'b'): ChessMove[];
//# sourceMappingURL=logic.d.ts.map
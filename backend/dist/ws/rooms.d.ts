import { WebSocket } from 'ws';
import { GameContext } from '../engine/index.js';
import type { GameRoomState, RoomPlayer, WsMessage } from './types.js';
export declare class GameRoom {
    state: GameRoomState;
    gameContext: GameContext;
    constructor(gameId: string, whiteTime: number, blackTime: number, increment: number);
    setPlayer(color: 'white' | 'black', player: RoomPlayer): void;
    getPlayer(color: 'white' | 'black'): RoomPlayer | null;
    start(): void;
    startClock(): void;
    stopClock(): void;
    makeMove(playerColor: 'white' | 'black', uci: string): {
        success: boolean;
        message: string;
    };
    private getAllLegalMoves;
    private isInCheck;
    private isSquareAttackedBy;
    private persistMove;
    resign(playerColor: 'white' | 'black'): void;
    acceptDraw(): void;
    private endGame;
    private persistGameResult;
    private buildGameStateMessage;
    private broadcastToOpponent;
    broadcast(message: WsMessage): void;
    handleDisconnect(playerColor: 'white' | 'black'): void;
    handleReconnect(playerColor: 'white' | 'black', ws: WebSocket): void;
    cleanup(): void;
}
//# sourceMappingURL=rooms.d.ts.map
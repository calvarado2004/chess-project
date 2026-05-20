export declare class WsGameServer {
    private wss;
    private lobby;
    private rooms;
    private playerRooms;
    constructor(server: ReturnType<typeof import('http').createServer>);
    private handleConnection;
    private handleAuth;
    private setupMessageHandler;
    private handleMessage;
    private createMatchedGame;
    private createWaitingRoom;
    private leaveRoom;
    private handleDisconnect;
    private findWsForPlayer;
    private broadcastLobby;
    startHeartbeat(intervalMs?: number): void;
    cleanup(): void;
}
declare module './lobby.js' {
    interface LobbyManager {
        findWaitingGame(color: 'white' | 'black' | 'any', timeControl: number): string | null;
    }
}
//# sourceMappingURL=server.d.ts.map
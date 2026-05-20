import type { LobbyEntry, LobbyPlayer, LobbyStatePayload } from './types.js';
export declare class LobbyManager {
    entries: Map<string, LobbyEntry>;
    join(entry: Omit<LobbyEntry, 'gameId'> & {
        gameId?: string;
    }): string;
    leave(playerId: string): LobbyEntry | null;
    getEntry(playerId: string): LobbyEntry | null;
    findByGameId(gameId: string): LobbyEntry | null;
    findMatchingPlayer(requesterId: string, color: 'white' | 'black', timeControl: number): LobbyEntry | null;
    getState(): LobbyPlayer[];
    clear(): void;
}
export declare function buildLobbyStatePayload(state: LobbyPlayer[]): LobbyStatePayload;
//# sourceMappingURL=lobby.d.ts.map
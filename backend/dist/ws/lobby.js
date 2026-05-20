import { v4 as uuidv4 } from 'uuid';
export class LobbyManager {
    entries = new Map();
    join(entry) {
        const gameId = entry.gameId || uuidv4();
        const lobbyEntry = { ...entry, gameId };
        this.entries.set(entry.playerId, lobbyEntry);
        return gameId;
    }
    leave(playerId) {
        const entry = this.entries.get(playerId);
        this.entries.delete(playerId);
        return entry || null;
    }
    getEntry(playerId) {
        return this.entries.get(playerId) || null;
    }
    findByGameId(gameId) {
        for (const entry of this.entries.values()) {
            if (entry.gameId === gameId)
                return entry;
        }
        return null;
    }
    findMatchingPlayer(requesterId, color, timeControl) {
        for (const entry of this.entries.values()) {
            if (entry.playerId === requesterId)
                continue;
            if (entry.color === color || entry.color === 'any') {
                if (entry.timeControl === timeControl) {
                    return entry;
                }
            }
        }
        return null;
    }
    getState() {
        return Array.from(this.entries.values()).map((e) => ({
            id: e.playerId,
            username: e.username,
            displayName: e.displayName,
            color: e.color,
            timeControl: e.timeControl,
            increment: e.increment,
            gameId: e.gameId,
        }));
    }
    clear() {
        this.entries.clear();
    }
}
export function buildLobbyStatePayload(state) {
    return { players: state };
}
//# sourceMappingURL=lobby.js.map
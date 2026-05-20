import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type { LobbyEntry, LobbyPlayer, LobbyStatePayload } from './types.js';

export class LobbyManager {
  public entries: Map<string, LobbyEntry> = new Map();

  join(entry: Omit<LobbyEntry, 'gameId'> & { gameId?: string }): string {
    const gameId = entry.gameId || uuidv4();
    const lobbyEntry: LobbyEntry = { ...entry, gameId };
    this.entries.set(entry.playerId, lobbyEntry);
    return gameId;
  }

  leave(playerId: string): LobbyEntry | null {
    const entry = this.entries.get(playerId);
    this.entries.delete(playerId);
    return entry || null;
  }

  getEntry(playerId: string): LobbyEntry | null {
    return this.entries.get(playerId) || null;
  }

  findByGameId(gameId: string): LobbyEntry | null {
    for (const entry of this.entries.values()) {
      if (entry.gameId === gameId) return entry;
    }
    return null;
  }

  findMatchingPlayer(requesterId: string, color: 'white' | 'black', timeControl: number): LobbyEntry | null {
    for (const entry of this.entries.values()) {
      if (entry.playerId === requesterId) continue;
      if (entry.color === color || entry.color === 'any') {
        if (entry.timeControl === timeControl) {
          return entry;
        }
      }
    }
    return null;
  }

  getState(): LobbyPlayer[] {
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

  clear(): void {
    this.entries.clear();
  }
}

export function buildLobbyStatePayload(state: LobbyPlayer[]): LobbyStatePayload {
  return { players: state };
}

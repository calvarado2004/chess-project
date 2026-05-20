import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { ChessWebSocket, type OnlineGame } from '../lib/ws';
import type { LobbyPlayer } from '../lib/ws-types';
import { getAccessToken } from '../lib/auth';

interface GameWebSocketContextType {
  ws: ChessWebSocket | null;
  lobbyPlayers: LobbyPlayer[];
  onlineGame: OnlineGame | null;
  isConnected: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  joinLobby: (options?: { timeControl?: number; increment?: number; color?: 'white' | 'black' | 'any' }) => void;
  leaveLobby: () => void;
  createGame: (options?: { timeControl?: number; increment?: number; color?: 'white' | 'black' | 'any' }) => void;
  joinGame: (gameId: string, color: 'white' | 'black') => void;
  sendMove: (uci: string, gameId: string) => void;
  resign: (gameId: string) => void;
  offerDraw: (gameId: string) => void;
  acceptDraw: (gameId: string) => void;
  declineDraw: (gameId: string) => void;
  formatTime: (seconds: number) => string;
}

const GameWebSocketContext = createContext<GameWebSocketContextType | null>(null);

export function GameWebSocketProvider({ children }: { children: ReactNode }) {
  const [ws, setWs] = useState<ChessWebSocket | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [onlineGame, setOnlineGame] = useState<OnlineGame | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<ChessWebSocket | null>(null);

  // Shared message handlers
  const setupHandlers = useCallback((chessWs: ChessWebSocket) => {
    chessWs.on('lobby_state', (msg) => {
      setLobbyPlayers((msg.payload as { players: LobbyPlayer[] }).players);
    });

    chessWs.on('game_created', (msg) => {
      const payload = msg.payload as { gameId: string; waiting: boolean; timeControl?: number; color?: 'white' | 'black' };
      const tc = payload.timeControl ?? 600;
      console.log('[WS] game_created payload:', payload);
      setOnlineGame({
        gameId: payload.gameId,
        white: null,
        black: null,
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        turn: 'w',
        whiteTime: tc,
        blackTime: tc,
        status: 'waiting',
        playerColor: payload.color,
      });
    });

    chessWs.on('game_joined', (msg) => {
      const payload = msg.payload as {
        gameId: string; timeControl?: number; increment?: number;
        requesterColor?: 'white' | 'black'; matchColor?: 'white' | 'black';
        playerColor?: 'white' | 'black';
      };
      const tc = payload.timeControl ?? 600;
      // Use playerColor from server if available (most reliable), otherwise derive from requesterColor
      const playerColor = payload.playerColor || (payload.requesterColor === 'white' ? 'black' : 'white');
      console.log('[WS] game_joined payload:', payload, 'resolved playerColor:', playerColor);
      setOnlineGame({
        gameId: payload.gameId,
        white: null,
        black: null,
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        turn: 'w',
        whiteTime: tc,
        blackTime: tc,
        status: 'waiting',
        playerColor,
      });
    });

    chessWs.on('game_state', (msg) => {
      const payload = msg.payload as {
        gameId: string;
        fen: string;
        turn: 'w' | 'b';
        whiteTime: number;
        blackTime: number;
        moveNumber: number;
        status: 'playing' | 'finished' | 'paused' | 'waiting';
        whitePlayer: { id: string; username: string; displayName: string } | null;
        blackPlayer: { id: string; username: string; displayName: string } | null;
        lastMove?: string;
        capturedByWhite?: number[];
        capturedByBlack?: number[];
        moveHistory?: string[];
      };

      setOnlineGame((prev) => ({
        gameId: payload.gameId,
        white: payload.whitePlayer ? {
          id: payload.whitePlayer.id,
          username: payload.whitePlayer.username,
          displayName: payload.whitePlayer.displayName,
        } : null,
        black: payload.blackPlayer ? {
          id: payload.blackPlayer.id,
          username: payload.blackPlayer.username,
          displayName: payload.blackPlayer.displayName,
        } : null,
        fen: payload.fen,
        turn: payload.turn,
        whiteTime: payload.whiteTime,
        blackTime: payload.blackTime,
        status: payload.status === 'paused' ? 'playing' : payload.status,
        lastMove: payload.lastMove,
        playerColor: prev?.playerColor, // preserve playerColor from game_created/game_joined
        moveHistory: payload.moveHistory,
      }));
    });

    chessWs.on('game_over', (msg) => {
      const payload = msg.payload as { result: string; reason: string; fen: string };
      setOnlineGame((prev) => prev ? {
        ...prev,
        status: 'finished',
        result: payload.result,
        reason: payload.reason,
      } : null);
    });

    chessWs.on('error', (msg) => {
      const payload = msg.payload as { message: string; code?: string };
      console.warn('[WS] Error:', payload.message);
    });

    chessWs.on('opponent_disconnected', (msg) => {
      const payload = msg.payload as { message: string };
      console.warn('[WS] Opponent disconnected:', payload.message);
    });

    chessWs.on('opponent_reconnected', () => {});

    chessWs.on('draw_offer', (msg) => {
      const payload = msg.payload as { from: 'white' | 'black' };
      console.log(`[WS] Draw offered by ${payload.from}`);
    });
  }, []);

  const connect = useCallback(async (): Promise<boolean> => {
    const token = getAccessToken();
    if (!token) return false;

    // Disconnect existing if any
    if (wsRef.current) {
      wsRef.current.disconnect();
    }

    const chessWs = new ChessWebSocket(token);
    setupHandlers(chessWs);

    const result = await chessWs.connect();
    if (result) {
      wsRef.current = chessWs;
      setWs(chessWs);
      setIsConnected(true);
    }
    return result;
  }, [setupHandlers]);

  // Auto-connect on mount if token exists
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      connect().catch(() => {});
    }
  }, [connect]);

  const disconnect = useCallback(() => {
    wsRef.current?.disconnect();
    wsRef.current = null;
    setWs(null);
    setIsConnected(false);
    setOnlineGame(null);
    setLobbyPlayers([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.disconnect();
      wsRef.current = null;
    };
  }, []);

  const joinLobby = useCallback((options?: { timeControl?: number; increment?: number; color?: 'white' | 'black' | 'any' }) => {
    ws?.joinLobby(options);
  }, [ws]);

  const leaveLobby = useCallback(() => {
    ws?.leaveLobby();
  }, [ws]);

  const createGame = useCallback((options?: { timeControl?: number; increment?: number; color?: 'white' | 'black' | 'any' }) => {
    ws?.createGame(options);
  }, [ws]);

  const joinGame = useCallback((gameId: string, color: 'white' | 'black') => {
    ws?.joinGame(gameId, color);
  }, [ws]);

  const sendMove = useCallback((uci: string, gameId: string) => {
    ws?.sendMove(uci, gameId);
  }, [ws]);

  const resign = useCallback((gameId: string) => {
    ws?.resign(gameId);
  }, [ws]);

  const offerDraw = useCallback((gameId: string) => {
    ws?.offerDraw(gameId);
  }, [ws]);

  const acceptDraw = useCallback((gameId: string) => {
    ws?.acceptDraw(gameId);
  }, [ws]);

  const declineDraw = useCallback((gameId: string) => {
    ws?.declineDraw(gameId);
  }, [ws]);

  const formatTime = useCallback((seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  return (
    <GameWebSocketContext.Provider
      value={{
        ws,
        lobbyPlayers,
        onlineGame,
        isConnected,
        connect,
        disconnect,
        joinLobby,
        leaveLobby,
        createGame,
        joinGame,
        sendMove,
        resign,
        offerDraw,
        acceptDraw,
        declineDraw,
        formatTime,
      }}
    >
      {children}
    </GameWebSocketContext.Provider>
  );
}

export function useGameWebSocket(): GameWebSocketContextType {
  const context = useContext(GameWebSocketContext);
  if (!context) {
    throw new Error('useGameWebSocket must be used within a GameWebSocketProvider');
  }
  return context;
}

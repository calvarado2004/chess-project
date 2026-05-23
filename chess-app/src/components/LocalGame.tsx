import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useChessGame } from '../hooks/useChessGame';
import { STRENGTH_MAP } from '../engine';
import { recordStockfishGame } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Board from './Board';
import EvalBar from './EvalBar';
import Clock from './Clock';
import MoveHistory from './MoveHistory';
import CapturedPieces from './CapturedPieces';
import Settings from './Settings';
import StatusBar from './StatusBar';
import Controls from './Controls';
import type { GameMode } from '../engine';

export default function LocalGame() {
  const location = useLocation();
  const { refreshUser } = useAuth();
  const {
    board, turn, gameMode, gameStatus, gameOver, strengthLevel,
    clock, engineStatus, engineEval, whiteName, blackName,
    selectedSquare, legalMovesForSelected, lastMove,
    moveHistory, capturedByWhite, capturedByBlack,
    enPassantTarget, castlingRights,
    retractsRemaining, retractUsed, canRetract,
    selectSquare, retractMove, resetGame, setGameMode, setStrength,
    formatTime, generatePGN,
  } = useChessGame();

  const [timeControl, setTimeControl] = useState(10);
  const gameStartedAt = useRef(Date.now());
  const recordedGameKey = useRef<string | null>(null);
  const appliedRouteMode = useRef(false);
  const boardOrientation = gameMode === 'hbe' ? 'black' : 'white';

  useEffect(() => {
    if (appliedRouteMode.current) return;
    appliedRouteMode.current = true;

    const routeState = location.state as { gameMode?: GameMode } | null;
    if (routeState?.gameMode && routeState.gameMode !== gameMode) {
      setGameMode(routeState.gameMode);
      gameStartedAt.current = Date.now();
      recordedGameKey.current = null;
      resetGame(timeControl);
    }
  }, [gameMode, location.state, resetGame, setGameMode, timeControl]);

  const handleNewGame = useCallback(() => {
    gameStartedAt.current = Date.now();
    recordedGameKey.current = null;
    resetGame(timeControl);
  }, [resetGame, timeControl]);

  const handleGameModeChange = useCallback((mode: GameMode) => {
    setGameMode(mode);
    gameStartedAt.current = Date.now();
    recordedGameKey.current = null;
    resetGame(timeControl);
  }, [setGameMode, resetGame, timeControl]);

  const handleStrengthChange = useCallback((level: string) => {
    setStrength(level);
  }, [setStrength]);

  const handleTimeControlChange = useCallback((minutes: number) => {
    setTimeControl(minutes);
    gameStartedAt.current = Date.now();
    recordedGameKey.current = null;
    resetGame(minutes);
  }, [resetGame]);

  useEffect(() => {
    if (!gameOver || (gameMode !== 'hwe' && gameMode !== 'hbe')) return;
    if (retractUsed) return;

    const gameKey = `${gameMode}-${strengthLevel}-${moveHistory.length}-${gameStatus}`;
    if (recordedGameKey.current === gameKey) return;
    recordedGameKey.current = gameKey;

    const humanColor = gameMode === 'hwe' ? 'w' : 'b';
    let result: 'win' | 'loss' | 'draw' = 'draw';
    if (gameStatus === 'checkmate') {
      const winner = turn === 'w' ? 'b' : 'w';
      result = winner === humanColor ? 'win' : 'loss';
    } else if (gameStatus === 'white_time_win') {
      result = humanColor === 'w' ? 'win' : 'loss';
    } else if (gameStatus === 'black_time_win') {
      result = humanColor === 'b' ? 'win' : 'loss';
    }

    const stockfishElo = STRENGTH_MAP[strengthLevel]?.elo ?? 800;
    const gameDuration = Math.max(0, Math.round((Date.now() - gameStartedAt.current) / 1000));

    recordStockfishGame({
      stockfishElo,
      playerColor: humanColor,
      result,
      moveCount: moveHistory.length,
      gameDuration,
    })
      .then(() => refreshUser())
      .catch((err: unknown) => {
        console.error('Failed to record Stockfish game', err);
      });
  }, [gameMode, gameOver, gameStatus, moveHistory.length, refreshUser, retractUsed, strengthLevel, turn]);

  const handleSavePGN = useCallback(() => {
    const pgn = generatePGN();
    const blob = new Blob([pgn], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess-game-${new Date().toISOString().slice(0, 10)}.pgn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatePGN]);

  return (
    <div id="app">
      <div className="sidebar-left">
        <EvalBar eval={engineEval} engineStatus={engineStatus} />
        <CapturedPieces capturedByWhite={capturedByWhite} capturedByBlack={capturedByBlack} />
      </div>

      <div className="main-col">
        <Clock color="black" name={blackName} timeFormatted={formatTime(clock.blackTime)} isActive={clock.running && turn === 'b'} icon="♚" />
        <StatusBar gameStatus={gameStatus} turn={turn} />
        <Board state={{ board, turn, selectedSquare, legalMovesForSelected, lastMove, moveHistory, capturedByWhite, capturedByBlack, gameOver, gameStatus, enPassantTarget, castlingRights }} onSelectSquare={selectSquare} orientation={boardOrientation} />
        <Clock color="white" name={whiteName} timeFormatted={formatTime(clock.whiteTime)} isActive={clock.running && turn === 'w'} icon="♔" />
        <Controls
          onNewGame={handleNewGame}
          onRetractMove={retractMove}
          canRetract={canRetract}
          retractsRemaining={retractsRemaining}
          showRetract={gameMode === 'hwe' || gameMode === 'hbe'}
        />
      </div>

      <div className="sidebar-right">
        <Settings
          gameMode={gameMode}
          strengthLevel={strengthLevel}
          timeControl={timeControl}
          onGameModeChange={handleGameModeChange}
          onStrengthChange={handleStrengthChange}
          onTimeControlChange={handleTimeControlChange}
        />
        <div className="panel">
          <h3>Move History</h3>
          {retractUsed && (
            <p style={{ margin: '0 0 8px', color: '#f9e2af', fontSize: '12px', lineHeight: 1.4 }}>
              Retract used: this Stockfish game will not count for ELO.
            </p>
          )}
          <MoveHistory moves={moveHistory} />
          <button
            onClick={handleSavePGN}
            style={{
              width: '100%', marginTop: '12px', padding: '8px', fontSize: '13px',
              fontWeight: 600, background: '#89b4fa', color: '#1e1e2e',
              border: 'none', borderRadius: '6px', cursor: 'pointer',
            }}
          >
            💾 Save PGN
          </button>
        </div>
      </div>
    </div>
  );
}

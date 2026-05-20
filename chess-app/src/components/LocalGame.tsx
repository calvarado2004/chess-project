import { useState, useCallback } from 'react';
import { useChessGame } from '../hooks/useChessGame';
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
  const {
    board, turn, gameMode, gameStatus, gameOver, strengthLevel,
    clock, engineStatus, engineEval, whiteName, blackName,
    selectedSquare, legalMovesForSelected, lastMove,
    moveHistory, capturedByWhite, capturedByBlack,
    enPassantTarget, castlingRights,
    selectSquare, resetGame, setGameMode, setStrength,
    formatTime, generatePGN,
  } = useChessGame();

  const [timeControl, setTimeControl] = useState(10);

  const handleNewGame = useCallback(() => {
    resetGame(timeControl);
  }, [resetGame, timeControl]);

  const handleGameModeChange = useCallback((mode: GameMode) => {
    setGameMode(mode);
    resetGame(timeControl);
  }, [setGameMode, resetGame, timeControl]);

  const handleStrengthChange = useCallback((level: string) => {
    setStrength(level);
  }, [setStrength]);

  const handleTimeControlChange = useCallback((minutes: number) => {
    setTimeControl(minutes);
    resetGame(minutes);
  }, [resetGame]);

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
        <Board state={{ board, turn, selectedSquare, legalMovesForSelected, lastMove, moveHistory, capturedByWhite, capturedByBlack, gameOver, gameStatus, enPassantTarget, castlingRights }} onSelectSquare={selectSquare} />
        <Clock color="white" name={whiteName} timeFormatted={formatTime(clock.whiteTime)} isActive={clock.running && turn === 'w'} icon="♔" />
        <Controls onNewGame={handleNewGame} />
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

import { useState, useEffect, useCallback } from 'react';
import { useChessGame } from './hooks/useChessGame';
import Board from './components/Board';
import EvalBar from './components/EvalBar';
import Clock from './components/Clock';
import MoveHistory from './components/MoveHistory';
import CapturedPieces from './components/CapturedPieces';
import Settings from './components/Settings';
import StatusBar from './components/StatusBar';
import Controls from './components/Controls';
import type { GameMode } from './engine';
import './index.css';

function App() {
  const {
    board, turn, gameMode, gameStatus, gameOver, strengthLevel,
    clock, engineStatus, engineEval, whiteName, blackName,
    lastEngineBestMove,
    selectedSquare, legalMovesForSelected, lastMove,
    moveHistory, capturedByWhite, capturedByBlack,
    enPassantTarget, castlingRights,
    selectSquare, resetGame, setGameMode, setStrength,
    generatePGN, formatTime,
  } = useChessGame();

  const [timeControl, setTimeControl] = useState(10);

  const handleNewGame = useCallback(() => {
    resetGame(timeControl);
  }, [resetGame, timeControl]);

  const handleGameModeChange = useCallback((mode: GameMode) => {
    setGameMode(mode);
  }, [setGameMode]);

  const handleStrengthChange = useCallback((level: string) => {
    setStrength(level);
  }, [setStrength]);

  const handleTimeControlChange = useCallback((minutes: number) => {
    setTimeControl(minutes);
    resetGame(minutes);
  }, [resetGame]);

  const handleDownloadPGN = useCallback(() => {
    const pgn = generatePGN();
    const blob = new Blob([pgn], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'chess-game.pgn'; a.click();
    URL.revokeObjectURL(url);
  }, [generatePGN]);

  const handleLoadPGN = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => console.log('PGN loaded:', reader.result);
    reader.readAsText(file);
  }, []);

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
        <Settings gameMode={gameMode} strengthLevel={strengthLevel} timeControl={timeControl} onGameModeChange={handleGameModeChange} onStrengthChange={handleStrengthChange} onTimeControlChange={handleTimeControlChange} />
        <div className="panel">
          <h3>Move History</h3>
          <MoveHistory moves={moveHistory} />
        </div>
        <div className="panel">
          <h3>PGN</h3>
          <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
            <button className="btn" onClick={handleDownloadPGN} style={{ width: '100%' }}>Download PGN</button>
            <label style={{ fontSize: '11px', color: '#888' }}>Load PGN: <input type="file" accept=".pgn" onChange={handleLoadPGN} style={{ marginTop: '4px', width: '100%' }} /></label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

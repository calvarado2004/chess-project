import React from 'react';
import type { GameStatus } from '../engine';

interface StatusBarProps {
  gameStatus: GameStatus;
  turn: 'w' | 'b';
}

const StatusBar: React.FC<StatusBarProps> = ({ gameStatus, turn }) => {
  if (gameStatus === 'checkmate') {
    const winner = turn === 'w' ? 'Black' : 'White';
    return <div className="status-bar"><span className="checkmate">Checkmate — {winner} wins</span></div>;
  }
  if (gameStatus === 'stalemate') {
    return <div className="status-bar"><span className="stalemate">Stalemate! Draw</span></div>;
  }
  if (gameStatus === 'white_time_win') {
    return <div className="status-bar"><span className="time-win">White wins on time</span></div>;
  }
  if (gameStatus === 'black_time_win') {
    return <div className="status-bar"><span className="time-win">Black wins on time</span></div>;
  }

  const turnName = turn === 'w' ? 'White' : 'Black';
  let html = `<span className="turn-indicator">${turnName} to move</span>`;
  if (gameStatus === 'check') html += ` — <span className="check">Check!</span>`;

  return <div className="status-bar" dangerouslySetInnerHTML={{ __html: html }} />;
};

export default StatusBar;

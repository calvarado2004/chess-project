import React from 'react';
import type { EngineEval, EngineStatus } from '../engine';

interface EvalBarProps {
  eval: EngineEval | null;
  engineStatus: EngineStatus;
}

const EvalBar: React.FC<EvalBarProps> = ({ eval: evalData, engineStatus }) => {
  let whitePercent = 50;
  let displayText = '—';
  // eslint-disable-next-line no-useless-assignment
  let statusText = 'Unavailable';

  switch (engineStatus) {
    case 'ready': statusText = 'Ready'; break;
    case 'thinking': statusText = 'Thinking…'; break;
    case 'analyzing': statusText = 'Analyzing…'; break;
    case 'error': statusText = 'Error'; break;
    default: statusText = 'Unavailable';
  }

  if (evalData) {
    if (evalData.type === 'mate') {
      if (evalData.whiteValue > 0) {
        whitePercent = 100;
        displayText = `Mate in ${evalData.whiteValue}`;
      } else if (evalData.whiteValue < 0) {
        whitePercent = 0;
        displayText = `Mate in ${Math.abs(evalData.whiteValue)}`;
      }
    } else {
      const cp = Math.max(-1000, Math.min(1000, evalData.whiteValue));
      whitePercent = 50 + (cp / 1000) * 50;
      const pawnVal = cp / 100;
      displayText = pawnVal >= 0 ? `+${pawnVal.toFixed(2)}` : pawnVal.toFixed(2);
    }
  }

  return (
    <div className="panel" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
      <div className="eval-bar-container">
        <div className="eval-bar-white" style={{ height: `${whitePercent}%` }} />
        <div className="eval-bar-black" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
        <h3 style={{ marginBottom: '4px' }}>Evaluation</h3>
        <div className="eval-text">{displayText}</div>
        <div className={`stockfish-status ${engineStatus}`}>Stockfish: {statusText}</div>
      </div>
    </div>
  );
};

export default EvalBar;

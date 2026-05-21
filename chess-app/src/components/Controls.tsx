import React from 'react';

interface ControlsProps {
  onNewGame: () => void;
  onRetractMove?: () => void;
  canRetract?: boolean;
  retractsRemaining?: number;
  showRetract?: boolean;
}

const Controls: React.FC<ControlsProps> = ({
  onNewGame,
  onRetractMove,
  canRetract = false,
  retractsRemaining = 0,
  showRetract = false,
}) => (
  <div className="controls-row">
    <button className="btn" onClick={onNewGame}>New Game</button>
    {showRetract && (
      <button className="btn" onClick={onRetractMove} disabled={!canRetract}>
        Retract ({retractsRemaining})
      </button>
    )}
  </div>
);

export default Controls;

import React from 'react';

interface ControlsProps {
  onNewGame: () => void;
}

const Controls: React.FC<ControlsProps> = ({ onNewGame }) => (
  <div className="controls-row">
    <button className="btn" onClick={onNewGame}>New Game</button>
  </div>
);

export default Controls;

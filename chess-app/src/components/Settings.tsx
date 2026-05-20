import React from 'react';
import type { GameMode } from '../engine';

interface SettingsProps {
  gameMode: GameMode;
  strengthLevel: string;
  timeControl: number;
  onGameModeChange: (mode: GameMode) => void;
  onStrengthChange: (level: string) => void;
  onTimeControlChange: (minutes: number) => void;
}

const Settings: React.FC<SettingsProps> = ({
  gameMode, strengthLevel, timeControl,
  onGameModeChange, onStrengthChange, onTimeControlChange,
}) => (
  <div className="panel">
    <h3>Settings</h3>
    <div className="setting-row">
      <label htmlFor="gameMode">Game Mode</label>
      <select id="gameMode" value={gameMode} onChange={e => onGameModeChange(e.target.value as GameMode)}>
        <option value="hvh">Human vs Human</option>
        <option value="hwe">Human (White) vs Stockfish</option>
        <option value="hbe">Human (Black) vs Stockfish</option>
      </select>
    </div>
    <div className="setting-row">
      <label htmlFor="strength">Stockfish Strength</label>
      <select id="strength" value={strengthLevel} onChange={e => onStrengthChange(e.target.value)}>
        <option value="beginner">Beginner (800)</option>
        <option value="casual">Casual (1100)</option>
        <option value="intermediate">Intermediate (1400)</option>
        <option value="advanced">Advanced (1800)</option>
        <option value="strong">Strong (2200)</option>
      </select>
    </div>
    <div className="setting-row">
      <label htmlFor="timeControl">Time Control</label>
      <select id="timeControl" value={timeControl} onChange={e => onTimeControlChange(Number(e.target.value))}>
        <option value={5}>5 min</option>
        <option value={10}>10 min</option>
      </select>
    </div>
  </div>
);

export default Settings;

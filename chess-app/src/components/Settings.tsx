import React from 'react';
import { STRENGTH_MAP } from '../engine';
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
        <option value="hwe">Human vs Stockfish (White)</option>
        <option value="hbe">Human vs Stockfish (Black)</option>
        <option value="hvh">Human vs Human (Local)</option>
        <option value="online">Online Multiplayer</option>
      </select>
    </div>
    {(gameMode === 'hwe' || gameMode === 'hbe') && (
      <>
        <div className="setting-row">
          <label htmlFor="strength">Stockfish Strength</label>
          <select id="strength" value={strengthLevel} onChange={e => onStrengthChange(e.target.value)}>
            {Object.entries(STRENGTH_MAP).map(([level, config]) => (
              <option key={level} value={level}>
                {config.elo} ELO
              </option>
            ))}
          </select>
        </div>
        <div className="setting-row">
          <label htmlFor="timeControl">Time Control</label>
          <select id="timeControl" value={timeControl} onChange={e => onTimeControlChange(Number(e.target.value))}>
            <option value={5}>5 min</option>
            <option value={10}>10 min</option>
          </select>
        </div>
      </>
    )}
  </div>
);

export default Settings;

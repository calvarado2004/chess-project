import React from 'react';

interface ClockProps {
  color: 'white' | 'black';
  name: string;
  timeFormatted: string;
  isActive: boolean;
  icon: string;
}

const Clock: React.FC<ClockProps> = ({ color, name, timeFormatted, isActive, icon }) => (
  <div className={`player-label ${color}-player ${isActive ? 'active' : ''}`}>
    <span className="player-icon">{icon}</span>
    <span className="player-name">{name}</span>
    <span className="player-clock">{timeFormatted}</span>
  </div>
);

export default Clock;

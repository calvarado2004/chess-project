import React from 'react';

interface MoveHistoryProps {
  moves: string[];
}

const MoveHistory: React.FC<MoveHistoryProps> = ({ moves }) => (
  <div className="move-history" id="moveHistory">
    {Array.from({ length: Math.ceil(moves.length / 2) }, (_, i) => {
      const moveNum = i + 1;
      const white = moves[i * 2] || '';
      const black = moves[i * 2 + 1] || '';
      return (
        <div className="move-pair" key={i}>
          <span className="move-num">{moveNum}.</span>
          <span className="move-w">{white}</span>
          <span className="move-b">{black}</span>
        </div>
      );
    })}
  </div>
);

export default MoveHistory;

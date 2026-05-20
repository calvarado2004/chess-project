import React from 'react';
import { PIECE_UNICODE, isWhite, PIECE_TYPE } from '../engine';

interface CapturedPiecesProps {
  capturedByWhite: number[];
  capturedByBlack: number[];
}

const sortPieces = (arr: number[]): number[] => {
  const order: Record<string, number> = { q: 0, r: 1, b: 2, n: 3, p: 4 };
  return [...arr].sort((a, b) => (order[PIECE_TYPE[a]] ?? 5) - (order[PIECE_TYPE[b]] ?? 5));
};

const renderPieces = (pieces: number[]) =>
  pieces.map((p, i) => {
    const isW = isWhite(p);
    const style: React.CSSProperties = isW
      ? { color: '#ffffff', WebkitTextStroke: '0.5px #8B7355', WebkitTextFillColor: '#ffffff' }
      : { color: '#3e2723', WebkitTextFillColor: '#3e2723', textShadow: '0 0 2px rgba(255,255,255,0.1)' };
    return (
      <span key={i} className={`cap-piece ${isW ? 'white-piece' : 'black-piece'}`} style={style}>
        {PIECE_UNICODE[p]}
      </span>
    );
  });

const CapturedPieces: React.FC<CapturedPiecesProps> = ({ capturedByWhite, capturedByBlack }) => (
  <div className="panel">
    <h3>Captured</h3>
    <div style={{ marginBottom: '6px' }}>
      <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>White captured:</div>
      <div className="captured-row">{renderPieces(sortPieces(capturedByWhite))}</div>
    </div>
    <div>
      <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>Black captured:</div>
      <div className="captured-row">{renderPieces(sortPieces(capturedByBlack))}</div>
    </div>
  </div>
);

export default CapturedPieces;

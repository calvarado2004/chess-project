import React from 'react';
import { PIECE_SVG, PIECE_TYPE, isWhite } from '../engine';

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
    return (
      <img
        key={i}
        src={`/${PIECE_SVG[p]}`}
        alt=""
        aria-hidden="true"
        className={`cap-piece ${isW ? 'white-piece' : 'black-piece'}`}
        draggable={false}
      />
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

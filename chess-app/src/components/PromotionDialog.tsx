import React from 'react';
import {
  W_QUEEN, W_ROOK, W_BISHOP, W_KNIGHT,
  B_QUEEN, B_ROOK, B_BISHOP, B_KNIGHT,
  PIECE_SVG, isWhite,
} from '../engine';
import type { Coord } from '../engine';

interface PromotionDialogProps {
  from: Coord;
  to: Coord;
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  onDismiss?: () => void;
}

const promotionPieces: { piece: 'q' | 'r' | 'b' | 'n'; white: number; black: number; label: string }[] = [
  { piece: 'q', white: W_QUEEN, black: B_QUEEN, label: 'Queen' },
  { piece: 'r', white: W_ROOK, black: B_ROOK, label: 'Rook' },
  { piece: 'b', white: W_BISHOP, black: B_BISHOP, label: 'Bishop' },
  { piece: 'n', white: W_KNIGHT, black: B_KNIGHT, label: 'Knight' },
];

export const PromotionDialog: React.FC<PromotionDialogProps> = ({ from, to, onSelect, onDismiss }) => {
  // White promotes to row 0, black promotes to row 7
  const whiteColor = to.row === 0;

  return (
    <div className="promotion-dialog-overlay" onClick={() => onDismiss?.()}>
      <div className="promotion-dialog" onClick={e => e.stopPropagation()}>
        <div className="promotion-dialog-title">Promote to:</div>
        <div className="promotion-dialog-pieces">
          {promotionPieces.map(({ piece, white, black, label }) => {
            const pieceId = whiteColor ? white : black;
            const svgPath = PIECE_SVG[pieceId];
            return (
              <button
                key={piece}
                className="promotion-dialog-piece"
                onClick={() => onSelect(piece)}
                title={label}
              >
                <img
                  src={`/${svgPath}`}
                  alt={label}
                  className="promotion-dialog-piece-img"
                  draggable={false}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PromotionDialog;

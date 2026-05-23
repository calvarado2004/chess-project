import React from 'react';
import { PIECE_SVG, PIECE_UNICODE, isWhite, isBlack, FILES, RANKS } from '../engine';
import type { Coord, ChessMove } from '../engine';

interface SquareProps {
  row: number;
  col: number;
  piece: number | null;
  isSelected: boolean;
  isLastMove: boolean;
  isInCheck: boolean;
  legalMoves: ChessMove[];
  onClick: () => void;
  displayRow?: number;
  displayCol?: number;
}

function isLegalTarget(move: ChessMove, row: number, col: number): boolean {
  return move.to.row === row && move.to.col === col;
}

function isLegalCapture(move: ChessMove, row: number, col: number, piece: number | null): boolean {
  if (!isLegalTarget(move, row, col)) return false;
  if (piece !== null) return true;
  return move.enPassant === true;
}

export const Square: React.FC<SquareProps> = React.memo(({
  row,
  col,
  piece,
  isSelected,
  isLastMove,
  isInCheck,
  legalMoves,
  onClick,
  displayRow = row,
  displayCol = col,
}) => {
  const isLight = (row + col) % 2 === 0;

  const baseClass = `square ${isLight ? 'light' : 'dark'}`;
  const highlightClass = [
    isSelected && 'selected',
    isLastMove && 'last-move',
    isInCheck && 'in-check',
  ]
    .filter(Boolean)
    .join(' ');

  const squareClass = [baseClass, highlightClass].filter(Boolean).join(' ');

  const isLegalDot = legalMoves.some((m) => isLegalTarget(m, row, col) && !isLegalCapture(m, row, col, piece));
  const isLegalRing = legalMoves.some((m) => isLegalCapture(m, row, col, piece));

  const pieceSvg = piece !== null ? PIECE_SVG[piece] : null;
  const isWhitePiece = piece !== null && isWhite(piece);

  return (
    <div
      className={squareClass}
      onClick={onClick}
    >
      {pieceSvg && (
        <img
          src={`/${pieceSvg}`}
          alt=""
          aria-hidden="true"
          className={`piece ${isWhitePiece ? 'white-piece' : 'black-piece'}`}
          draggable={false}
        />
      )}

      {isLegalDot && (
        <div className="legal-dot" />
      )}

      {isLegalRing && (
        <>
          <div className="legal-ring" />
          <div className="legal-ring-notch-top-left" />
          <div className="legal-ring-notch-top-right" />
          <div className="legal-ring-notch-bottom-left" />
          <div className="legal-ring-notch-bottom-right" />
        </>
      )}

      {displayCol === 0 && (
        <span className="coord-rank">{RANKS[row]}</span>
      )}

      {displayRow === 7 && (
        <span className="coord-file">{FILES[col]}</span>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.row === nextProps.row &&
    prevProps.col === nextProps.col &&
    prevProps.piece === nextProps.piece &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isLastMove === nextProps.isLastMove &&
    prevProps.isInCheck === nextProps.isInCheck &&
    prevProps.legalMoves === nextProps.legalMoves &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.displayRow === nextProps.displayRow &&
    prevProps.displayCol === nextProps.displayCol
  );
});

export default Square;

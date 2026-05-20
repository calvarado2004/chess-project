import React from 'react';
import Square from './Square';
import { EMPTY, W_KING, B_KING } from '../engine';
import type { Coord, ChessMove, GameStatus } from '../engine';

interface BoardState {
  board: number[][];
  turn: 'w' | 'b';
  selectedSquare: Coord | null;
  legalMovesForSelected: ChessMove[];
  lastMove: ChessMove | null;
  moveHistory: string[];
  capturedByWhite: number[];
  capturedByBlack: number[];
  gameOver: boolean;
  gameStatus: GameStatus;
  enPassantTarget: Coord | null;
  castlingRights: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
}

interface BoardProps {
  state: BoardState;
  onSelectSquare: (row: number, col: number) => void;
}

function findKing(board: number[][], color: 'w' | 'b') {
  const king = color === 'w' ? W_KING : B_KING;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] === king) return { row: r, col: c };
  return null;
}

function boardsEqual(a: number[][], b: number[][]): boolean {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (a[r][c] !== b[r][c]) return false;
  return true;
}

function coordsEqual(a: { row: number; col: number } | null, b: { row: number; col: number } | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.row === b.row && a.col === b.col;
}

function moveListsEqual(a: ChessMove[], b: ChessMove[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].from.row !== b[i].from.row || a[i].from.col !== b[i].from.col ||
        a[i].to.row !== b[i].to.row || a[i].to.col !== b[i].to.col) return false;
  }
  return true;
}

const BoardInner: React.FC<BoardProps> = ({ state, onSelectSquare }) => {
  const kingInCheck =
    (state.gameStatus === 'check' || state.gameStatus === 'checkmate')
      ? findKing(state.board, state.turn)
      : null;

  return (
    <div className="board-wrapper">
      <div className="board-container" id="boardContainer">
        {Array.from({ length: 8 }, (_, row) =>
          Array.from({ length: 8 }, (_, col) => {
            const piece = state.board[row][col] === EMPTY ? null : state.board[row][col];
            const isSelected =
              state.selectedSquare?.row === row && state.selectedSquare?.col === col;
            const isLastMove = !!(
              state.lastMove &&
              ((row === state.lastMove.from.row && col === state.lastMove.from.col) ||
                (row === state.lastMove.to.row && col === state.lastMove.to.col))
            );
            const isInCheck =
              kingInCheck?.row === row && kingInCheck?.col === col;

            return (
              <Square
                key={`${row}-${col}`}
                row={row}
                col={col}
                piece={piece}
                isSelected={isSelected}
                isLastMove={isLastMove}
                isInCheck={isInCheck}
                legalMoves={state.legalMovesForSelected}
                onClick={() => onSelectSquare(row, col)}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

const Board = React.memo(BoardInner, (prevProps, nextProps) => {
  const prev = prevProps.state;
  const next = nextProps.state;
  if (!boardsEqual(prev.board, next.board)) return false;
  if (!coordsEqual(prev.selectedSquare, next.selectedSquare)) return false;
  if (!moveListsEqual(prev.legalMovesForSelected, next.legalMovesForSelected)) return false;
  if (prev.lastMove !== next.lastMove) return false;
  if (prev.gameOver !== next.gameOver) return false;
  if (prev.gameStatus !== next.gameStatus) return false;
  if (!coordsEqual(prev.enPassantTarget, next.enPassantTarget)) return false;
  if (prev.castlingRights !== next.castlingRights) return false;
  return true;
});

export default Board;

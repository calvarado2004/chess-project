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

const Board: React.FC<BoardProps> = React.memo(({ state, onSelectSquare }) => {
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
});

export default Board;

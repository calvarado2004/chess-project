import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Board from './Board';
import { useTheory } from '../context/TheoryContext';
import {
  cloneState,
  getLegalMoves,
  getAllLegalMoves,
  isInCheck,
  applyMoveToBoard,
  GameContext,
} from '../engine';
import type { Coord, ChessMove, GameStatus } from '../engine';
import type { TheoryExercise } from '../data/theory/types';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

function moveToUCI(move: ChessMove): string {
  return FILES[move.from.col] + RANKS[move.from.row] + FILES[move.to.col] + RANKS[move.to.row] + (move.promotion || '');
}

function parseFENGameContext(fen: string): GameContext {
  const board: number[][] = [];
  const parts = fen.split(' ');
  const pieceRow = parts[0];
  const turn = parts[1] || 'w';
  const castling = parts[2] || '-';
  const ep = parts[3] || '-';
  const halfmove = parts[4] || '0';
  const fullmove = parts[5] || '1';

  const rows = pieceRow.split('/');
  for (const row of rows) {
    const boardRow: number[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < parseInt(ch, 10); i++) boardRow.push(0);
      } else {
        const isWhitePiece = ch === ch.toUpperCase();
        const piece = ch.toLowerCase();
        let value = 0;
        switch (piece) {
          case 'p': value = isWhitePiece ? 1 : 7; break;
          case 'n': value = isWhitePiece ? 2 : 8; break;
          case 'b': value = isWhitePiece ? 3 : 9; break;
          case 'r': value = isWhitePiece ? 4 : 10; break;
          case 'q': value = isWhitePiece ? 5 : 11; break;
          case 'k': value = isWhitePiece ? 6 : 12; break;
        }
        boardRow.push(value);
      }
    }
    board.push(boardRow);
  }

  return {
    board,
    turn: turn === 'b' ? 'b' : 'w',
    selectedSquare: null,
    legalMovesForSelected: [],
    lastMove: null,
    moveHistory: [],
    capturedByWhite: [],
    capturedByBlack: [],
    gameOver: false,
    gameStatus: 'normal',
    enPassantTarget: ep === '-' ? null : {
      row: 8 - parseInt(ep[1], 10),
      col: ep.charCodeAt(0) - 97,
    },
    castlingRights: {
      wK: castling.includes('K'),
      wQ: castling.includes('Q'),
      bK: castling.includes('k'),
      bQ: castling.includes('q'),
    },
    halfmoveClock: parseInt(halfmove, 10) || 0,
    fullmoveNumber: parseInt(fullmove, 10) || 1,
  };
}

function deriveGameStatus(ctx: GameContext): GameStatus {
  const inCheck = isInCheck(ctx.board, ctx.turn);
  const legal = getAllLegalMoves(ctx, ctx.turn);
  if (legal.length === 0) {
    return inCheck ? 'checkmate' : 'stalemate';
  }
  return inCheck ? 'check' : 'normal';
}

interface ExerciseBoardProps {
  exercise: TheoryExercise;
  lessonId: string;
  onBack: () => void;
  onNextExercise: () => void;
  onComplete: () => void;
}

export default function ExerciseBoard({
  exercise,
  lessonId,
  onBack,
  onNextExercise,
  onComplete,
}: ExerciseBoardProps) {
  const { updateProgress, completeLesson } = useTheory();

  const [gameState, setGameState] = useState<GameContext>(() => {
    const ctx = parseFENGameContext(exercise.fen);
    ctx.gameStatus = deriveGameStatus(ctx);
    return ctx;
  });

  const [selectedSquare, setSelectedSquare] = useState<Coord | null>(null);
  const [legalMovesForSelected, setLegalMovesForSelected] = useState<ChessMove[]>([]);
  const [moveIndex, setMoveIndex] = useState(0);
  const [correctMoves, setCorrectMoves] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'incorrect' | null; message: string }>({
    type: null,
    message: '',
  });
  const [hintsShown, setHintsShown] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [lastMoveMade, setLastMoveMade] = useState<ChessMove | null>(null);

  const expectedMoves = exercise.expectedMoves;
  const maxMoves = exercise.maxMoves || expectedMoves.length;

  const handleSelectSquare = useCallback((row: number, col: number) => {
    if (isComplete) return;

    // No square selected yet
    if (!selectedSquare) {
      const piece = gameState.board[row][col];
      if (piece === 0) return;
      const pieceColor = piece >= 1 && piece <= 6 ? 'w' : 'b';
      if (pieceColor !== exercise.targetColor) {
        setFeedback({
          type: 'incorrect',
          message: `It's ${exercise.targetColor === 'w' ? 'White' : 'Black'}'s turn.`,
        });
        return;
      }
      setSelectedSquare({ row, col });
      const legal = getLegalMoves(gameState, row, col);
      setLegalMovesForSelected(legal);
      setFeedback({ type: null, message: '' });
      return;
    }

    // Deselect same square
    if (selectedSquare.row === row && selectedSquare.col === col) {
      setSelectedSquare(null);
      setLegalMovesForSelected([]);
      return;
    }

    // Check if legal move target
    const move = legalMovesForSelected.find((m) => m.to.row === row && m.to.col === col);

    if (move) {
      const uciMove = moveToUCI(move);
      const expected = expectedMoves[moveIndex];
      const isCorrect = uciMove === expected || uciMove.substring(0, 4) === expected.substring(0, 4);

      if (isCorrect) {
        setFeedback({ type: 'correct', message: 'Correct!' });
        setCorrectMoves((c) => c + 1);
      } else {
        setFeedback({ type: 'incorrect', message: `Not quite. Expected: ${expected}` });
      }

      // Execute the move
      const newContext = cloneState(gameState);
      applyMoveToBoard(newContext.board, move);
      newContext.turn = newContext.turn === 'w' ? 'b' : 'w';
      newContext.selectedSquare = null;
      newContext.legalMovesForSelected = [];
      newContext.lastMove = move;
      newContext.gameStatus = deriveGameStatus(newContext);

      setGameState(newContext);
      setSelectedSquare(null);
      setLegalMovesForSelected([]);
      setLastMoveMade(move);

      const newMoveIndex = moveIndex + 1;
      setMoveIndex(newMoveIndex);

      if (newMoveIndex >= maxMoves) {
        setIsComplete(true);
        const finalCorrect = correctMoves + (isCorrect ? 1 : 0);
        const score = Math.round((finalCorrect / maxMoves) * 100);
        updateProgress(lessonId, { exerciseScore: score });
      }
      return;
    }

    // Select different piece
    const piece = gameState.board[row][col];
    if (piece === 0) {
      setSelectedSquare(null);
      setLegalMovesForSelected([]);
      return;
    }
    const pieceColor = piece >= 1 && piece <= 6 ? 'w' : 'b';
    if (pieceColor !== exercise.targetColor) {
      setFeedback({
        type: 'incorrect',
        message: `It's ${exercise.targetColor === 'w' ? 'White' : 'Black'}'s turn.`,
      });
      return;
    }
    setSelectedSquare({ row, col });
    const legal = getLegalMoves(gameState, row, col);
    setLegalMovesForSelected(legal);
    setFeedback({ type: null, message: '' });
  }, [
    gameState, selectedSquare, legalMovesForSelected, exercise.targetColor,
    moveIndex, expectedMoves, maxMoves, correctMoves, isComplete, lessonId, updateProgress,
  ]);

  const handleShowHint = useCallback(() => {
    if (exercise.hints && hintsShown < exercise.hints.length) {
      setHintsShown((h) => h + 1);
    }
  }, [exercise.hints, hintsShown]);

  const handleRetry = useCallback(() => {
    const ctx = parseFENGameContext(exercise.fen);
    ctx.gameStatus = deriveGameStatus(ctx);
    setGameState(ctx);
    setSelectedSquare(null);
    setLegalMovesForSelected([]);
    setMoveIndex(0);
    setCorrectMoves(0);
    setFeedback({ type: null, message: '' });
    setHintsShown(0);
    setIsComplete(false);
    setLastMoveMade(null);
  }, [exercise]);

  const boardStateForRender = useMemo(() => ({
    board: gameState.board,
    turn: gameState.turn,
    selectedSquare,
    legalMovesForSelected,
    lastMove: lastMoveMade,
    moveHistory: gameState.moveHistory,
    capturedByWhite: gameState.capturedByWhite,
    capturedByBlack: gameState.capturedByBlack,
    gameOver: gameState.gameOver,
    gameStatus: gameState.gameStatus,
    enPassantTarget: gameState.enPassantTarget,
    castlingRights: gameState.castlingRights,
  }), [gameState, selectedSquare, legalMovesForSelected, lastMoveMade]);

  const score = moveIndex > 0
    ? Math.round((correctMoves / Math.min(moveIndex, maxMoves)) * 100)
    : 0;

  const currentHint = exercise.hints && hintsShown > 0 && hintsShown <= exercise.hints.length
    ? exercise.hints[hintsShown - 1]
    : null;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '16px', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <button
            onClick={onBack}
            style={{
              background: 'none', border: 'none', color: '#a6adc8',
              cursor: 'pointer', fontSize: '14px', padding: 0, marginBottom: '8px',
            }}
          >
            &larr; Back to Lesson
          </button>
          <h2 style={{ color: '#cdd6f4', fontSize: '20px', fontWeight: 700, margin: 0 }}>
            {exercise.title}
          </h2>
          <p style={{ color: '#a6adc8', fontSize: '14px', margin: '4px 0 0' }}>
            {exercise.description}
          </p>
        </div>
        <div style={{
          padding: '8px 16px', background: '#1e1e2e', borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '12px', color: '#a6adc8' }}>Score</div>
          <div style={{
            fontSize: '24px', fontWeight: 700,
            color: isComplete
              ? (score >= 70 ? '#a6e3a1' : '#f9e2af')
              : '#89b4fa',
          }}>
            {isComplete ? `${score}%` : `${correctMoves}/${Math.min(moveIndex, maxMoves)}`}
          </div>
        </div>
      </div>

      {/* Move progress bar */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '16px',
      }}>
        {Array.from({ length: maxMoves }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1, height: '4px', borderRadius: '2px',
              background: i < correctMoves
                ? '#a6e3a1'
                : i < moveIndex
                  ? '#f38ba8'
                  : '#45475a',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>

      {/* Board */}
      <div style={{
        background: '#1e1e2e', borderRadius: '8px', padding: '16px',
        marginBottom: '16px',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '12px',
        }}>
          <span style={{
            padding: '4px 12px', background: '#45475a', borderRadius: '4px',
            color: '#a6adc8', fontSize: '13px',
          }}>
            Move {moveIndex + 1} of {maxMoves}
            {` (${exercise.targetColor === 'w' ? 'White' : 'Black'} to play)`}
          </span>
          <button
            onClick={handleShowHint}
            disabled={!exercise.hints || hintsShown >= exercise.hints.length}
            style={{
              padding: '4px 12px',
              background: !exercise.hints || hintsShown >= exercise.hints.length
                ? '#313244'
                : '#f9e2af',
              color: !exercise.hints || hintsShown >= exercise.hints.length
                ? '#6c7086'
                : '#1e1e2e',
              border: 'none', borderRadius: '4px',
              cursor: !exercise.hints || hintsShown >= exercise.hints.length
                ? 'not-allowed'
                : 'pointer',
              fontSize: '13px', fontWeight: 600,
            }}
          >
            Hint ({hintsShown}/{exercise.hints?.length || 0})
          </button>
        </div>

        <Board
          state={boardStateForRender}
          onSelectSquare={handleSelectSquare}
        />

        {/* Feedback */}
        {feedback.type && (
          <div style={{
            marginTop: '12px', padding: '10px 14px', borderRadius: '6px',
            background: feedback.type === 'correct' ? '#a6e3a122' : '#f38ba822',
            border: `1px solid ${feedback.type === 'correct' ? '#a6e3a1' : '#f38ba8'}`,
            color: feedback.type === 'correct' ? '#a6e3a1' : '#f38ba8',
            fontSize: '14px', fontWeight: 500,
          }}>
            {feedback.message}
          </div>
        )}

        {/* Hint display */}
        {currentHint && (
          <div style={{
            marginTop: '8px', padding: '10px 14px', borderRadius: '6px',
            background: '#f9e2af22', border: '1px solid #f9e2af',
            color: '#f9e2af', fontSize: '13px', lineHeight: 1.5,
          }}>
            <strong>Hint {hintsShown}:</strong> {currentHint}
          </div>
        )}
      </div>

      {/* Completion */}
      {isComplete && (
        <div style={{
          background: '#1e1e2e', borderRadius: '8px', padding: '24px',
          textAlign: 'center', marginBottom: '16px',
        }}>
          <h3 style={{
            color: score >= 70 ? '#a6e3a1' : '#f9e2af',
            fontSize: '22px', fontWeight: 700, margin: '0 0 8px',
          }}>
            {score >= 70 ? 'Excellent!' : score >= 40 ? 'Good effort!' : 'Keep practicing!'}
          </h3>
          <p style={{ color: '#a6adc8', fontSize: '15px', margin: '0 0 20px' }}>
            You got {correctMoves} out of {maxMoves} moves correct ({score}%).
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleRetry}
              style={{
                padding: '10px 24px', background: '#89b4fa', color: '#1e1e2e',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 600, fontSize: '14px',
              }}
            >
              Retry
            </button>
            <button
              onClick={onNextExercise}
              style={{
                padding: '10px 24px', background: '#45475a', color: '#cdd6f4',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 600, fontSize: '14px',
              }}
            >
              Next Exercise
            </button>
            <button
              onClick={() => {
                completeLesson(lessonId);
                onComplete();
              }}
              style={{
                padding: '10px 24px', background: '#a6e3a1', color: '#1e1e2e',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 600, fontSize: '14px',
              }}
            >
              Complete Lesson
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

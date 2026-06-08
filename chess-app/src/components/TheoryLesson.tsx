import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTheory } from '../context/TheoryContext';
import { getLessonById, totalPositionCount, sequentialPositionIndex } from '../data';
import Board from './Board';
import {
  cloneState,
  getLegalMoves,
  applyMoveToBoard,
  GameContext,
  EMPTY,
} from '../engine';
import type { Coord, ChessMove, GameStatus } from '../engine';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

function parseFENGameContext(fen: string): GameContext {
  const board: number[][] = [];
  const parts = fen.split(' ');
  const pieceRow = parts[0];
  const turn = parts[1] || 'w';

  const rows = pieceRow.split('/');
  for (const row of rows) {
    const boardRow: number[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < parseInt(ch, 10); i++) boardRow.push(0);
      } else {
        const isWhite = ch === ch.toUpperCase();
        const piece = ch.toLowerCase();
        let value = 0;
        switch (piece) {
          case 'p': value = isWhite ? 1 : 7; break;
          case 'n': value = isWhite ? 2 : 8; break;
          case 'b': value = isWhite ? 3 : 9; break;
          case 'r': value = isWhite ? 4 : 10; break;
          case 'q': value = isWhite ? 5 : 11; break;
          case 'k': value = isWhite ? 6 : 12; break;
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
    enPassantTarget: null,
    castlingRights: { wK: false, wQ: false, bK: false, bQ: false },
    halfmoveClock: 0,
    fullmoveNumber: 1,
  };
}

function moveToUCI(move: ChessMove): string {
  return FILES[move.from.col] + RANKS[move.from.row] + FILES[move.to.col] + RANKS[move.to.row];
}

export default function TheoryLesson() {
  const { id: lessonId } = useParams<{ id: string }>();
  const { progress, updateProgress, completeLesson } = useTheory();
  const lesson = getLessonById(lessonId || '');
  
  const [currentSection, setCurrentSection] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [gameState, setGameState] = useState<GameContext | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Coord | null>(null);
  const [legalMovesForSelected, setLegalMovesForSelected] = useState<ChessMove[]>([]);
  const [lastMove, setLastMove] = useState<ChessMove | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [moveFeedback, setMoveFeedback] = useState<'correct' | 'incorrect' | null>(null);

  useEffect(() => {
    if (lesson?.sections?.[currentSection]?.positions?.[currentPosition]) {
      const pos = lesson.sections[currentSection].positions[currentPosition];
      setGameState(parseFENGameContext(pos.fen));
      setMoveFeedback(null);
      setShowHint(false);
      setSelectedSquare(null);
      setLegalMovesForSelected([]);
      setLastMove(null);
    }
  }, [lesson, currentSection, currentPosition]);

  useEffect(() => {
    if (lesson) {
      updateProgress(lesson.id, {
        lastPositionIndex: currentSection * 10 + currentPosition,
      });
    }
  }, [currentSection, currentPosition, lesson, updateProgress]);

  const handleSelectSquare = (row: number, col: number) => {
    if (!gameState) return;

    if (!selectedSquare) {
      const piece = gameState.board[row][col];
      if (piece === EMPTY) return;
      setSelectedSquare({ row, col });
      setLegalMovesForSelected(getLegalMoves(gameState, row, col));
    } else {
      const move = legalMovesForSelected.find(m => m.to.row === row && m.to.col === col);
      if (move) {
        const uci = moveToUCI(move);
        const position = lesson?.sections[currentSection]?.positions[currentPosition];
        
        if (position?.expectedMove) {
          // Check if the move matches the expected move (simple UCI comparison)
          const expectedUCI = position.expectedMove.replace(/[+#]/g, '').replace(/[a-h][1-8]x[a-h][1-8]/, '$&');
          const isCorrect = uci === expectedUCI || uci.startsWith(expectedUCI.substring(0, 4));
          
          setMoveFeedback(isCorrect ? 'correct' : 'incorrect');
          setTimeout(() => setMoveFeedback(null), 1000);
        }

        const newState = cloneState(gameState);
        applyMoveToBoard(newState.board, move);
        newState.turn = newState.turn === 'w' ? 'b' : 'w';
        newState.lastMove = move;
        
        setGameState(newState);
        setLastMove(move);
        setSelectedSquare(null);
        setLegalMovesForSelected([]);
      } else {
        const piece = gameState.board[row][col];
        if (piece !== EMPTY) {
          setSelectedSquare({ row, col });
          setLegalMovesForSelected(getLegalMoves(gameState, row, col));
        } else {
          setSelectedSquare(null);
          setLegalMovesForSelected([]);
        }
      }
    }
  };

  const nextPosition = () => {
    const section = lesson?.sections[currentSection];
    if (section && currentPosition < section.positions.length - 1) {
      setCurrentPosition(p => p + 1);
    } else if (currentSection < (lesson?.sections.length || 0) - 1) {
      setCurrentSection(s => s + 1);
      setCurrentPosition(0);
    }
  };

  const prevPosition = () => {
    if (currentPosition > 0) {
      setCurrentPosition(p => p - 1);
    } else if (currentSection > 0) {
      const prevSec = currentSection - 1;
      setCurrentSection(prevSec);
      setCurrentPosition((lesson?.sections[prevSec]?.positions.length || 0) - 1);
    }
  };

  if (!lesson) {
    return (
      <div className="theory-lesson">
        <h1>Lesson not found</h1>
        <Link to="/learn">← Back to Theory School</Link>
      </div>
    );
  }

  const section = lesson.sections[currentSection];
  const position = section?.positions[currentPosition];
  // Sequential position number across all sections (for the "X / Y" counter).
  // Note: lastPositionIndex stored in progress uses a separate packed encoding.
  const totalPositions = totalPositionCount(lesson.sections);
  const currentPositionIndex = sequentialPositionIndex(lesson.sections, currentSection, currentPosition);

  const boardState = useMemo(() => ({
    board: gameState?.board || [],
    turn: gameState?.turn || 'w',
    selectedSquare,
    legalMovesForSelected,
    lastMove,
    moveHistory: [],
    capturedByWhite: [],
    capturedByBlack: [],
    gameOver: false,
    gameStatus: 'normal' as GameStatus,
    enPassantTarget: null,
    castlingRights: { wK: false, wQ: false, bK: false, bQ: false },
  }), [gameState, selectedSquare, legalMovesForSelected, lastMove]);

  return (
    <div className="theory-lesson">
      <div className="lesson-header">
        <Link to={`/learn/${lesson.category}`} className="back-link">
          ← Back to {lesson.category}
        </Link>
        <h1>{lesson.title}</h1>
        <div className="lesson-meta">
          <span className="lesson-difficulty">{lesson.difficulty}</span>
          <span className="lesson-time">⏱ ~{lesson.estimatedMinutes} min</span>
        </div>
      </div>

      <div className="lesson-content">
        <div className="lesson-board">
          <div className="board-container">
            {gameState && (
              <Board
                state={boardState}
                onSelectSquare={handleSelectSquare}
              />
            )}
          </div>

          <div className="position-nav">
            <button onClick={prevPosition} disabled={currentSection === 0 && currentPosition === 0}>
              ← Previous
            </button>
            <span className="position-counter">
              {currentPositionIndex + 1} / {totalPositions}
            </span>
            <button onClick={nextPosition} disabled={currentSection === (lesson.sections.length || 0) - 1 && currentPosition === (section?.positions.length || 0) - 1}>
              Next →
            </button>
          </div>

          {moveFeedback && (
            <div className={`move-feedback ${moveFeedback}`}>
              {moveFeedback === 'correct' ? '✓ Correct!' : '✗ Try again'}
            </div>
          )}
        </div>

        <div className="lesson-text">
          <h2>{section?.title}</h2>
          <p>{section?.content}</p>

          {position && (
            <div className="position-commentary">
              <h3>Position</h3>
              <p>{position.commentary}</p>
              
              {position.expectedMove && (
                <div className="expected-move">
                  <strong>Your move:</strong> {position.expectedMove}
                </div>
              )}

              {position.hints && (
                <div className="hints">
                  <button className="hint-btn" onClick={() => setShowHint(!showHint)}>
                    {showHint ? 'Hide' : 'Show'} Hint
                  </button>
                  {showHint && (
                    <ul>
                      {position.hints.map((hint, i) => (
                        <li key={i}>{hint}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="lesson-actions">
            {currentSection === (lesson.sections.length || 0) - 1 &&
             currentPosition === (section?.positions.length || 0) - 1 && (
              <button
                className="complete-lesson-btn"
                onClick={() => completeLesson(lesson.id)}
              >
                ✓ Complete Lesson
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="section-nav">
        <h3>Sections</h3>
        <ul>
          {lesson.sections?.map((sec, i) => (
            <li
              key={i}
              className={i === currentSection ? 'active' : ''}
              onClick={() => {
                setCurrentSection(i);
                setCurrentPosition(0);
              }}
            >
              {sec.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

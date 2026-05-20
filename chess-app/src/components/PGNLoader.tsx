import { useState, useCallback } from 'react';
import Board from './Board';
import Clock from './Clock';
import MoveHistory from './MoveHistory';
import CapturedPieces from './CapturedPieces';
import EvalBar from './EvalBar';
import type { Coord, ChessMove, GameStatus } from '../engine';
import { parsePGN, replayMovesFromPGN } from '../engine/pgn';
import { initBoard, isWhite as isWhitePiece, PIECE_TYPE, EMPTY } from '../engine';

export default function PGNLoader() {
  const [pgnInput, setPgnInput] = useState('');
  const [gameLoaded, setGameLoaded] = useState(false);
  const [gameInfo, setGameInfo] = useState<{ white: string; black: string; result: string }>({
    white: '', black: '', result: '*',
  });
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1); // -1 = initial position
  const [moveList, setMoveList] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Board state derived from replay
  const [board, setBoard] = useState<number[][]>(() => initBoard());
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [castlingRights, setCastlingRights] = useState({ wK: true, wQ: true, bK: true, bQ: true });
  const [enPassantTarget, setEnPassantTarget] = useState<Coord | null>(null);
  const [capturedByWhite, setCapturedByWhite] = useState<number[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<number[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Coord; to: Coord } | null>(null);

  const handleLoad = useCallback(() => {
    setError(null);
    if (!pgnInput.trim()) {
      setError('Please paste a PGN string or upload a file.');
      return;
    }

    try {
      const parsed = parsePGN(pgnInput);
      if (parsed.moves.length === 0) {
        setError('No moves found in PGN. Check the format.');
        return;
      }

      const { board: finalBoard, turn: finalTurn, moveHistory: finalMoves, castlingRights: cr, enPassantTarget: ep, lastMove: lm } =
        replayMovesFromPGN(parsed.moves);

      // We need to track the full move list for navigation
      setMoveList(parsed.moves);
      setGameInfo({
        white: parsed.headers.White || 'White',
        black: parsed.headers.Black || 'Black',
        result: parsed.result || '*',
      });

      // Start at initial position
      setCurrentMoveIndex(-1);
      setBoard(initBoard());
      setTurn('w');
      setMoveHistory([]);
      setCastlingRights({ wK: true, wQ: true, bK: true, bQ: true });
      setEnPassantTarget(null);
      setCapturedByWhite([]);
      setCapturedByBlack([]);
      setLastMove(null);
      setGameLoaded(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to parse PGN');
    }
  }, [pgnInput]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPgnInput(ev.target?.result as string);
    };
    reader.readAsText(file);
  }, []);

  // Navigate through moves
  const goToMove = useCallback((index: number) => {
    if (index < -1 || index >= moveList.length) return;
    setCurrentMoveIndex(index);

    if (index === -1) {
      // Initial position
      setLastMove(null);
      return;
    }

    // Replay from start to the target move
    const { board: targetBoard, turn: targetTurn, moveHistory: targetHistory, castlingRights: targetCR, enPassantTarget: targetEP, lastMove: targetLM } =
      replayMovesFromPGN(moveList.slice(0, index + 1));

    setBoard(targetBoard);
    setTurn(targetTurn);
    setMoveHistory(targetHistory);
    setLastMove(targetLM);

    // Calculate captured pieces by comparing initial and current board
    const initial = initBoard();
    const { white: capW, black: capB } = calculateCapturedPieces(initial, targetBoard);
    setCapturedByWhite(capW);
    setCapturedByBlack(capB);
    setCastlingRights(targetCR);
    setEnPassantTarget(targetEP);
  }, [moveList]);

  const goFirst = useCallback(() => goToMove(-1), [goToMove]);
  const goPrev = useCallback(() => goToMove(currentMoveIndex - 1), [currentMoveIndex, goToMove]);
  const goNext = useCallback(() => goToMove(currentMoveIndex + 1), [currentMoveIndex, goToMove]);
  const goLast = useCallback(() => goToMove(moveList.length - 1), [moveList.length, goToMove]);

  const isWhiteTurn = turn === 'w';
  const whiteName = gameInfo.white;
  const blackName = gameInfo.black;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      {!gameLoaded ? (
        /* PGN Input Form */
        <div style={{
          maxWidth: '700px', margin: '40px auto', padding: '32px',
          background: '#1e1e2e', borderRadius: '12px', color: '#cdd6f4',
        }}>
          <h2 style={{ color: '#89b4fa', marginBottom: '24px' }}>📄 Load PGN Game</h2>
          <p style={{ color: '#a6adc8', marginBottom: '16px', fontSize: '14px' }}>
            Paste a PGN game below or upload a .pgn file to study the position.
          </p>

          <textarea
            value={pgnInput}
            onChange={(e) => setPgnInput(e.target.value)}
            placeholder={`[Event "World Championship 2024"]\n[White "Player A"]\n[Black "Player B"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 ...`}
            rows={10}
            style={{
              width: '100%', padding: '12px', fontSize: '13px', fontFamily: 'monospace',
              background: '#313244', border: '1px solid #45475a', borderRadius: '8px',
              color: '#cdd6f4', resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <label style={{
              padding: '10px 20px', background: '#45475a', color: '#cdd6f4',
              borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              📁 Upload .pgn
              <input type="file" accept=".pgn,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            <button
              onClick={handleLoad}
              style={{
                padding: '10px 24px', background: '#89b4fa', color: '#1e1e2e',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
              }}
            >
              Load Game
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: '16px', padding: '12px', background: '#f38ba822',
              border: '1px solid #f38ba8', borderRadius: '8px', color: '#f38ba8', fontSize: '14px',
            }}>
              {error}
            </div>
          )}
        </div>
      ) : (
        /* Game Study View */
        <div>
          {/* Game info bar */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', marginBottom: '16px', background: '#1e1e2e',
            borderRadius: '8px', color: '#cdd6f4',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontWeight: 600 }}>
                {isWhiteTurn ? '⬜' : '⬛'} {isWhiteTurn ? whiteName : blackName}
              </span>
              <span style={{ color: '#a6adc8' }}>vs</span>
              <span style={{ fontWeight: 600 }}>
                {!isWhiteTurn ? '⬜' : '⬛'} {isWhiteTurn ? blackName : whiteName}
              </span>
            </div>
            <span style={{
              padding: '4px 12px', background: '#45475a', borderRadius: '4px', fontSize: '14px', fontWeight: 600,
            }}>
              Result: {gameInfo.result}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {/* Left sidebar */}
            <div style={{ width: '180px' }}>
              <EvalBar eval={null} engineStatus="unavailable" />
              <CapturedPieces capturedByWhite={capturedByWhite} capturedByBlack={capturedByBlack} />
            </div>

            {/* Main column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Clock
                color="black"
                name={blackName}
                timeFormatted="--:--"
                isActive={false}
                icon="♚"
              />

              <div style={{
                padding: '8px 16px', background: '#45475a', borderRadius: '6px',
                marginBottom: '8px', color: '#a6adc8', fontSize: '13px',
              }}>
                Move {Math.floor(currentMoveIndex / 2) + 1} of {moveList.length}
                {currentMoveIndex === -1 && ' (Initial Position)'}
              </div>

              <Board
                state={{
                  board,
                  turn,
                  selectedSquare: null,
                  legalMovesForSelected: [],
                  lastMove: lastMove,
                  moveHistory: moveHistory,
                  capturedByWhite,
                  capturedByBlack,
                  gameOver: false,
                  gameStatus: 'normal' as GameStatus,
                  enPassantTarget,
                  castlingRights,
                }}
                onSelectSquare={() => {}}
              />

              <Clock
                color="white"
                name={whiteName}
                timeFormatted="--:--"
                isActive={false}
                icon="♔"
              />

              {/* Navigation controls */}
              <div style={{
                display: 'flex', gap: '8px', marginTop: '16px',
              }}>
                <button className="btn" onClick={goFirst} title="First move">⏮</button>
                <button className="btn" onClick={goPrev} title="Previous move">◀</button>
                <button className="btn" onClick={goNext} title="Next move">▶</button>
                <button className="btn" onClick={goLast} title="Last move">⏭</button>
                <button className="btn" onClick={() => setGameLoaded(false)} style={{ marginLeft: '16px', background: '#45475a' }}>
                  Back
                </button>
              </div>

              {/* Progress bar */}
              {moveList.length > 0 && (
                <div style={{
                  width: '100%', maxWidth: '480px', height: '4px', background: '#45475a',
                  borderRadius: '2px', marginTop: '12px', cursor: 'pointer',
                  position: 'relative',
                }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const ratio = x / rect.width;
                    const moveIndex = Math.floor(ratio * moveList.length) - 1;
                    goToMove(Math.max(-1, Math.min(moveIndex, moveList.length - 1)));
                  }}
                >
                  <div style={{
                    width: `${moveList.length > 0 ? ((currentMoveIndex + 1) / moveList.length) * 100 : 0}%`,
                    height: '100%', background: '#89b4fa', borderRadius: '2px',
                    transition: 'width 0.1s',
                  }} />
                </div>
              )}
            </div>

            {/* Right sidebar - Move list */}
            <div style={{ width: '200px' }}>
              <div className="panel">
                <h3>Moves</h3>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {Array.from({ length: Math.ceil(moveList.length / 2) }, (_, i) => {
                    const whiteMove = moveList[i * 2];
                    const blackMove = moveList[i * 2 + 1];
                    const whiteIdx = i * 2;
                    const blackIdx = i * 2 + 1;
                    const whiteActive = currentMoveIndex === whiteIdx;
                    const blackActive = currentMoveIndex === blackIdx;
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex', gap: '4px', padding: '2px 0',
                          cursor: 'pointer',
                          background: (whiteActive || blackActive) ? '#45475a' : 'transparent',
                          borderRadius: '4px',
                        }}
                        onClick={() => {
                          if (whiteActive) goToMove(whiteIdx - 1);
                          else if (blackActive) goToMove(blackIdx - 1);
                          else goToMove(blackIdx);
                        }}
                      >
                        <span style={{ color: '#a6adc8', minWidth: '24px' }}>{i + 1}.</span>
                        <span style={{
                          flex: 1, color: whiteActive ? '#89b4fa' : '#cdd6f4', fontWeight: whiteActive ? 600 : 400,
                        }}>{whiteMove || ''}</span>
                        <span style={{
                          flex: 1, color: blackActive ? '#89b4fa' : '#cdd6f4', fontWeight: blackActive ? 600 : 400,
                        }}>{blackMove || ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function calculateCapturedPieces(initialBoard: number[][], currentBoard: number[][]): { white: number[]; black: number[] } {
  const whiteCaptured: number[] = [];
  const blackCaptured: number[] = [];

  // Count pieces in initial and current board
  const initialCounts: Record<number, number> = {};
  const currentCounts: Record<number, number> = {};

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const initPiece = initialBoard[r][c];
      const currPiece = currentBoard[r][c];
      if (initPiece !== EMPTY) initialCounts[initPiece] = (initialCounts[initPiece] || 0) + 1;
      if (currPiece !== EMPTY) currentCounts[currPiece] = (currentCounts[currPiece] || 0) + 1;
    }
  }

  // Calculate missing pieces
  const allPieces = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  for (const piece of allPieces) {
    const initCount = initialCounts[piece] || 0;
    const currCount = currentCounts[piece] || 0;
    const missing = initCount - currCount;
    if (missing > 0) {
      for (let i = 0; i < missing; i++) {
        if (isWhitePiece(piece)) {
          whiteCaptured.push(piece);
        } else {
          blackCaptured.push(piece);
        }
      }
    }
  }

  return { white: whiteCaptured, black: blackCaptured };
}

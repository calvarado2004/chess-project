import { useState, useCallback, useEffect, useRef } from 'react';
import { useGameWebSocket } from '../context/GameWebSocketContext';
import { useAuth } from '../context/AuthContext';
import Board from './Board';
import Clock from './Clock';
import MoveHistory from './MoveHistory';
import CapturedPieces from './CapturedPieces';
import EvalBar from './EvalBar';
import {
  colorOf,
  cloneState,
  getAllLegalMoves,
  getLegalMoves,
  isInCheck,
  parseUCIMove,
  PIECE_TYPE,
  type ChessMove,
  type Coord,
  type EngineEval,
  type EngineStatus,
  type GameContext,
  type GameStatus,
} from '../engine';

interface OnlineGameProps {
  onBackToLobby: () => void;
}

export default function OnlineGame({ onBackToLobby }: OnlineGameProps) {
  const { user } = useAuth();
  const {
    onlineGame,
    drawOfferFrom,
    drawDeclinedCount,
    sendMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    formatTime,
  } = useGameWebSocket();

  // Local clock state — updates independently to avoid full re-renders
  const [clockDisplay, setClockDisplay] = useState({ white: 0, black: 0 });
  const clockRef = useRef({ white: 0, black: 0 });

  const [board, setBoard] = useState<number[][]>(() => Array.from({ length: 8 }, () => Array(8).fill(0)));
  const boardRef = useRef(board);
  boardRef.current = board;
  const [selectedSquare, setSelectedSquare] = useState<Coord | null>(null);
  const [legalMovesForSelected, setLegalMovesForSelected] = useState<ChessMove[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameStatus, setGameStatus] = useState<GameStatus>('normal');
  const [capturedByWhite, setCapturedByWhite] = useState<number[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<number[]>([]);
  const [enPassantTarget, setEnPassantTarget] = useState<Coord | null>(null);
  const [castlingRights, setCastlingRights] = useState({ wK: true, wQ: true, bK: true, bQ: true });
  const [lastMove, setLastMove] = useState<ChessMove | null>(null);
  const [drawOffered, setDrawOffered] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [notification, setNotification] = useState('');
  const [engineEval, setEngineEval] = useState<EngineEval | null>(null);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('unavailable');

  const myColor = useRef<'white' | 'black' | null>(null);
  const engineRef = useRef<Worker | null>(null);
  const fenRef = useRef<string>('');
  const prevFenRef = useRef<string>('');

  // ===================== Stockfish =====================
  useEffect(() => {
    try {
      const worker = new Worker(new URL('/stockfish.js', import.meta.url), { type: 'classic' });
      worker.onmessage = (e) => {
        const msg = e.data;
        if (msg === 'uciok') {
          worker.postMessage('isready');
        } else if (msg === 'readyok') {
          setEngineStatus('ready');
          worker.postMessage('ucinewgame');
        } else if (typeof msg === 'string' && msg.startsWith('info') && msg.includes('score')) {
          const parts = msg.split(' ');
          const cpIdx = parts.indexOf('score');
          const mateIdx = parts.indexOf('score');
          if (cpIdx !== -1) {
            const type = parts[cpIdx + 1];
            const value = parseInt(parts[cpIdx + 2], 10);
            if (type === 'cp') {
              // Value is from side-to-move perspective, convert to white's
              const fenParts = fenRef.current.split(' ');
              const stm = fenParts[1];
              const whiteValue = stm === 'w' ? value : -value;
              setEngineEval({ type: 'cp' as const, whiteValue });
            } else if (type === 'mate') {
              const fenParts = fenRef.current.split(' ');
              const stm = fenParts[1];
              const whiteValue = stm === 'w' ? value : -value;
              setEngineEval({ type: 'mate' as const, whiteValue });
            }
          }
        }
      };
      worker.onerror = () => setEngineStatus('error');
      worker.postMessage('uci');
      engineRef.current = worker;
    } catch {
      setEngineStatus('unavailable');
    }
    return () => { engineRef.current?.terminate(); };
  }, []);

  // Clock interval — keeps display updated without context re-renders
  useEffect(() => {
    // Initialize clock from onlineGame
    if (onlineGame) {
      clockRef.current = { white: onlineGame.whiteTime, black: onlineGame.blackTime };
      setClockDisplay({ white: onlineGame.whiteTime, black: onlineGame.blackTime });
    }

    const interval = setInterval(() => {
      if (!onlineGame || onlineGame.status !== 'playing') return;
      const current = clockRef.current;
      const turn = onlineGame.turn;
      if (turn === 'w' && current.white > 0) {
        current.white--;
      } else if (turn === 'b' && current.black > 0) {
        current.black--;
      }
      setClockDisplay({ ...current });
    }, 1000);

    return () => clearInterval(interval);
  }, [onlineGame]);

  // Send FEN to Stockfish for evaluation whenever it changes
  useEffect(() => {
    if (!onlineGame?.fen || engineStatus !== 'ready') return;
    if (onlineGame.fen === fenRef.current) return;
    fenRef.current = onlineGame.fen;

    const worker = engineRef.current;
    if (!worker) return;

    worker.postMessage('stop');
    worker.postMessage('position fen ' + onlineGame.fen);
    worker.postMessage('go depth 10');
  }, [onlineGame?.fen, engineStatus]);

  // ===================== Game State =====================
  // Parse FEN to board — only update when FEN actually changes to avoid clearing selection
  useEffect(() => {
    if (!onlineGame || !onlineGame.fen) return;

    // Determine my color (only on initial load)
    if (!myColor.current) {
      if (onlineGame.playerColor) {
        myColor.current = onlineGame.playerColor;
      } else if (user && onlineGame.white && onlineGame.black) {
        myColor.current = onlineGame.white.id === user.id ? 'white' : 'black';
      }
    }

    // Only update board when FEN changes (prevents clearing selection on every game_state update)
    if (onlineGame.fen !== prevFenRef.current) {
      const previousFen = prevFenRef.current;
      const previousBoard = boardRef.current;
      const parsedLastMove = onlineGame.lastMove ? parseUCIMove(onlineGame.lastMove) : null;
      const newContext = parseFENGameContext(onlineGame.fen);
      const newBoard = newContext.board.map((boardRow) => [...boardRow]);
      const derivedStatus = getDerivedGameStatus(newContext);

      setBoard(newBoard);
      setEnPassantTarget(newContext.enPassantTarget);
      setCastlingRights(newContext.castlingRights);
      setGameStatus(derivedStatus);
      prevFenRef.current = onlineGame.fen;

      if (previousFen && parsedLastMove) {
        playOnlineMoveSound(previousBoard, parsedLastMove, derivedStatus);
      }

      // If the selected square no longer has a piece on the new board, clear selection
      if (selectedSquare) {
        const piece = newBoard[selectedSquare.row]?.[selectedSquare.col];
        if (!piece || piece === 0) {
          setSelectedSquare(null);
          setLegalMovesForSelected([]);
        }
      }
    }

    // Always update captured pieces
    if (onlineGame.capturedByWhite) setCapturedByWhite(onlineGame.capturedByWhite);
    if (onlineGame.capturedByBlack) setCapturedByBlack(onlineGame.capturedByBlack);
    setLastMove(onlineGame.lastMove ? parseUCIMove(onlineGame.lastMove) : null);
  }, [onlineGame?.fen, onlineGame?.capturedByWhite, onlineGame?.capturedByBlack, onlineGame?.lastMove, user?.id, onlineGame?.white?.id, onlineGame?.black?.id, onlineGame?.playerColor, selectedSquare]);

  // Game over detection
  useEffect(() => {
    if (!onlineGame || onlineGame.status !== 'finished') return;
    setGameOver(true);
    const reason = (onlineGame as any)?.reason;
    if (reason === 'checkmate') {
      const winner = myColor.current === 'white' ? 'Black' : 'White';
      setGameStatus('checkmate');
      showNotification(`Checkmate — ${winner} wins!`);
    } else if (reason === 'resign') {
      const winner = myColor.current === 'white' ? 'White' : 'Black';
      setGameStatus('checkmate');
      showNotification(`${winner} wins by resignation!`);
    } else if (reason === 'timeout') {
      const winner = myColor.current === 'white' ? 'White' : 'Black';
      setGameStatus(myColor.current === 'white' ? 'black_time_win' : 'white_time_win');
      showNotification(`${winner} wins on time!`);
    } else if (reason === 'draw' || reason === 'stalemate') {
      setGameStatus('stalemate');
      showNotification('Draw!');
    }
  }, [onlineGame?.status, (onlineGame as any)?.reason, myColor.current]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 5000);
  };

  const isMyTurn = onlineGame?.turn === (myColor.current === 'white' ? 'w' : 'b');

  const getCurrentGameContext = useCallback((): GameContext | null => {
    if (!onlineGame?.fen) return null;
    return parseFENGameContext(onlineGame.fen);
  }, [onlineGame?.fen]);

  const getSelectionMoves = useCallback((row: number, col: number): ChessMove[] => {
    const moveCtx = getCurrentGameContext();
    if (!moveCtx) return [];
    return getLegalMoves(moveCtx, row, col);
  }, [getCurrentGameContext]);

  const handleSelectSquare = useCallback((row: number, col: number) => {
    if (gameOver) return;
    if (!myColor.current) return;

    const piece = board[row]?.[col];
    const myTurnColor = myColor.current === 'white' ? 'w' : 'b';
    const isMyPiece = piece !== undefined && piece !== 0 && colorOf(piece) === myTurnColor;

    // Only allow selecting/moving if it's my turn (same as local game)
    const isMyTurn = onlineGame?.turn === myTurnColor;
    if (!isMyTurn && !selectedSquare) return;

    if (selectedSquare) {
      // Check if this is a legal move target
      const move = legalMovesForSelected.find(m => m.to.row === row && m.to.col === col);
      if (move) {
        const uci = `${String.fromCharCode(97 + selectedSquare.col)}${8 - selectedSquare.row}${String.fromCharCode(97 + col)}${8 - row}${move.promotion ?? ''}`;
        if (onlineGame?.gameId) {
          sendMove(uci, onlineGame.gameId);
        }
        setSelectedSquare(null);
        setLegalMovesForSelected([]);
      } else if (isMyPiece && isMyTurn) {
        // Switch selection to the newly clicked piece
        setSelectedSquare({ row, col });
        setLegalMovesForSelected(getSelectionMoves(row, col));
      } else {
        // Clicked empty square, opponent piece, or not my turn — deselect
        playIllegalSound();
        showNotification('Illegal move');
        setSelectedSquare(null);
        setLegalMovesForSelected([]);
      }
      return;
    }

    // Select a piece — only if it's my turn (same as local game)
    if (isMyPiece && isMyTurn) {
      setSelectedSquare({ row, col });
      setLegalMovesForSelected(getSelectionMoves(row, col));
    } else if (selectedSquare) {
      // Not my piece or not my turn — deselect
      setSelectedSquare(null);
      setLegalMovesForSelected([]);
    }
  }, [board, selectedSquare, legalMovesForSelected, gameOver, onlineGame?.gameId, onlineGame?.turn, getSelectionMoves, sendMove]);

  const handleResign = useCallback(() => {
    if (onlineGame?.gameId) {
      resign(onlineGame.gameId);
      showNotification('You resigned.');
    }
  }, [onlineGame?.gameId, resign]);

  const handleDrawOffer = useCallback(() => {
    if (onlineGame?.gameId) {
      offerDraw(onlineGame.gameId);
      setDrawOffered(true);
    }
  }, [onlineGame?.gameId, offerDraw]);

  const handleDrawAccept = useCallback(() => {
    if (onlineGame?.gameId) {
      acceptDraw(onlineGame.gameId);
    }
  }, [onlineGame?.gameId, acceptDraw]);

  const handleDrawDecline = useCallback(() => {
    if (onlineGame?.gameId) {
      declineDraw(onlineGame.gameId);
    }
  }, [onlineGame?.gameId, declineDraw]);

  useEffect(() => {
    if (drawDeclinedCount === 0) return;
    setDrawOffered(false);
    showNotification('Draw offer declined.');
  }, [drawDeclinedCount]);

  const handleBackToLobby = useCallback(() => {
    if (!gameOver && onlineGame?.status === 'playing') {
      setShowExitConfirm(true);
      return;
    }
    onBackToLobby();
  }, [gameOver, onlineGame?.status, onBackToLobby]);

  const whiteName = onlineGame?.white?.displayName || 'White';
  const blackName = onlineGame?.black?.displayName || 'Black';
  const boardOrientation = myColor.current === 'black' ? 'black' : 'white';

  const handleSavePGN = useCallback(() => {
    const moves = onlineGame?.moveHistory ?? [];
    const result = gameOver ? (gameStatus === 'checkmate' ? (myColor.current === 'white' ? '0-1' : '1-0') : '1/2-1/2') : '*';
    let pgn = `[Event "Online Chess Game"]\n[Site "Chess App"]\n[Date "${new Date().toISOString().slice(0, 10)}"]\n[Round "1"]\n[White "${whiteName}"]\n[Black "${blackName}"]\n[Result "${result}"]\n\n`;
    for (let i = 0; i < moves.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      pgn += moveNum + '. ' + moves[i];
      if (moves[i + 1]) pgn += ' ' + moves[i + 1];
      pgn += i % 2 === 1 ? '\n\n' : ' ';
    }
    pgn += result + '\n';
    const blob = new Blob([pgn], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess-game-${new Date().toISOString().slice(0, 10)}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  }, [onlineGame?.moveHistory, gameOver, gameStatus, whiteName, blackName]);

  return (
    <div id="app">
      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          padding: '12px 24px', background: '#1e1e2e', border: '2px solid #89b4fa',
          borderRadius: '8px', color: '#cdd6f4', fontSize: '16px', fontWeight: 600,
          zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          {notification}
        </div>
      )}

      {/* Draw offer modal */}
      {drawOfferFrom && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 999,
        }}>
          <div style={{
            background: '#1e1e2e', padding: '32px', borderRadius: '12px',
            textAlign: 'center', color: '#cdd6f4',
          }}>
            <h3 style={{ marginBottom: '16px' }}>Opponent offers a draw</h3>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={handleDrawAccept} style={{
                padding: '10px 24px', background: '#a6e3a1', color: '#1e1e2e',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
              }}>Accept</button>
              <button onClick={handleDrawDecline} style={{
                padding: '10px 24px', background: '#f38ba8', color: '#1e1e2e',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
              }}>Decline</button>
            </div>
          </div>
        </div>
      )}

      {/* Leave guard modal */}
      {showExitConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 999,
        }}>
          <div style={{
            background: '#1e1e2e', padding: '32px', borderRadius: '12px',
            textAlign: 'center', color: '#cdd6f4', maxWidth: '360px',
          }}>
            <h3 style={{ marginBottom: '12px' }}>Leave active game?</h3>
            <p style={{ marginBottom: '20px', color: '#a6adc8' }}>
              Multiplayer games must finish by draw agreement or resignation.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => { handleDrawOffer(); setShowExitConfirm(false); }} style={{
                padding: '10px 18px', background: '#89b4fa', color: '#1e1e2e',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
              }}>Offer Draw</button>
              <button onClick={() => { handleResign(); setShowExitConfirm(false); onBackToLobby(); }} style={{
                padding: '10px 18px', background: '#f38ba8', color: '#1e1e2e',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
              }}>Resign</button>
              <button onClick={() => setShowExitConfirm(false)} style={{
                padding: '10px 18px', background: '#45475a', color: '#cdd6f4',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="sidebar-left">
        <EvalBar eval={engineEval} engineStatus={engineStatus} />
        <CapturedPieces capturedByWhite={capturedByWhite} capturedByBlack={capturedByBlack} />
      </div>

      <div className="main-col">
        <Clock color="black" name={blackName} timeFormatted={formatTime(clockDisplay.black)} isActive={onlineGame?.turn === 'b' && onlineGame?.status === 'playing'} icon="♚" />

        {/* Status bar */}
        {gameOver ? (
          <div style={{
            padding: '8px 16px', background: '#45475a', borderRadius: '6px',
            marginBottom: '8px', color: '#cdd6f4', fontWeight: 600,
          }}>
            Game Over
          </div>
        ) : isMyTurn ? (
          <div style={{
            padding: '8px 16px', background: '#a6e3a133', border: '1px solid #a6e3a1',
            borderRadius: '6px', marginBottom: '8px', color: '#a6e3a1', fontWeight: 600,
          }}>
            Your turn
          </div>
        ) : (
          <div style={{
            padding: '8px 16px', background: '#45475a', borderRadius: '6px',
            marginBottom: '8px', color: '#a6adc8',
          }}>
            Opponent thinking...
          </div>
        )}

        <Board state={{ board, turn: onlineGame?.turn ?? 'w', selectedSquare, legalMovesForSelected, lastMove, moveHistory: [], capturedByWhite, capturedByBlack, gameOver, gameStatus, enPassantTarget, castlingRights }} onSelectSquare={handleSelectSquare} orientation={boardOrientation} />

        <Clock color="white" name={whiteName} timeFormatted={formatTime(clockDisplay.white)} isActive={onlineGame?.turn === 'w' && onlineGame?.status === 'playing'} icon="♔" />

        {/* Controls */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {!gameOver && onlineGame?.status === 'playing' && (
            <>
              <button className="btn" onClick={handleResign} style={{ background: '#f38ba8' }}>
                Resign
              </button>
              {!drawOffered && !drawOfferFrom && isMyTurn && (
                <button className="btn" onClick={handleDrawOffer}>
                  Draw
                </button>
              )}
            </>
          )}
          <button className="btn" onClick={handleBackToLobby}>
            Back to Lobby
          </button>
        </div>
      </div>

      <div className="sidebar-right">
        <div className="panel">
          <h3>Move History</h3>
          <MoveHistory moves={onlineGame?.moveHistory ?? []} />
          <button onClick={handleSavePGN} style={{
            width: '100%', marginTop: '12px', padding: '8px', fontSize: '13px',
            fontWeight: 600, background: '#89b4fa', color: '#1e1e2e',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
          }}>
            💾 Save PGN
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== Helpers =====================
function parseFENGameContext(fen: string): GameContext {
  const board: number[][] = [];
  const [pieceRow, turn = 'w', castling = '-', ep = '-', halfmove = '0', fullmove = '1'] = fen.split(' ');
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

function getDerivedGameStatus(context: GameContext): GameStatus {
  const statusContext = cloneState(context);
  const inCheck = isInCheck(statusContext.board, statusContext.turn);
  const legalMoves = getAllLegalMoves(statusContext, statusContext.turn);

  if (legalMoves.length === 0) {
    return inCheck ? 'checkmate' : 'stalemate';
  }

  return inCheck ? 'check' : 'normal';
}

function playOnlineMoveSound(previousBoard: number[][], move: ChessMove, status: GameStatus) {
  const piece = previousBoard[move.from.row]?.[move.from.col] ?? 0;
  const captured = previousBoard[move.to.row]?.[move.to.col] ?? 0;
  const isEnPassantCapture = piece !== 0 &&
    PIECE_TYPE[piece] === 'p' &&
    move.from.col !== move.to.col &&
    captured === 0;

  if (move.promotion) playPromotionSound();
  else if (captured !== 0 || isEnPassantCapture) playCaptureSound();
  else playMoveSound();

  if (status === 'checkmate') playCheckmateSound();
  else if (status === 'stalemate') playStalemateSound();
  else if (status === 'check') playCheckSound();
}

// ===================== Sound =====================
const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
let audioCtx: AudioContext | null = null;
function ensureAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function playMoveSound() {
  try { const ctx = ensureAudioCtx(); const t = ctx.currentTime;
    const bufLen = Math.floor(ctx.sampleRate * 0.04); const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0); for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 3);
    const noise = ctx.createBufferSource(); noise.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 1.2;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.45, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    noise.connect(bp).connect(ng).connect(ctx.destination); noise.start(t); noise.stop(t + 0.06);
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(180, t); osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.35, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(og).connect(ctx.destination); osc.start(t); osc.stop(t + 0.1);
  } catch {}
}
function playCaptureSound() {
  try { const ctx = ensureAudioCtx(); const t = ctx.currentTime;
    const bufLen = Math.floor(ctx.sampleRate * 0.1); const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0); for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2);
    const noise = ctx.createBufferSource(); noise.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(2500, t); bp.frequency.exponentialRampToValueAtTime(600, t + 0.08); bp.Q.value = 1.5;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.5, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    noise.connect(bp).connect(ng).connect(ctx.destination); noise.start(t); noise.stop(t + 0.1);
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(300, t); osc.frequency.exponentialRampToValueAtTime(100, t + 0.06);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.5, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(og).connect(ctx.destination); osc.start(t); osc.stop(t + 0.08);
  } catch {}
}
function playCheckSound() {
  try { const ctx = ensureAudioCtx(); const t = ctx.currentTime;
    [880, 1100].forEach((freq, i) => { const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
      const g = ctx.createGain(); const start = t + i * 0.08; g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(0.3, start + 0.01); g.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      osc.connect(g).connect(ctx.destination); osc.start(start); osc.stop(start + 0.3); });
  } catch {}
}
function playCheckmateSound() {
  try { const ctx = ensureAudioCtx(); const t = ctx.currentTime;
    [440, 554, 660].forEach(freq => { const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.2, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(g).connect(ctx.destination); osc.start(t); osc.stop(t + 0.5); });
    [330, 392, 494].forEach(freq => { const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
      const g = ctx.createGain(); const start = t + 0.35; g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(0.25, start + 0.02); g.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
      osc.connect(g).connect(ctx.destination); osc.start(start); osc.stop(start + 0.6); });
  } catch {}
}
function playPromotionSound() {
  try { const ctx = ensureAudioCtx(); const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => { const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
      const g = ctx.createGain(); const start = t + i * 0.07; g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(0.25, start + 0.008); g.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(g).connect(ctx.destination); osc.start(start); osc.stop(start + 0.35); });
  } catch {}
}
function playIllegalSound() {
  try { const ctx = ensureAudioCtx(); const t = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(200, t); osc.frequency.exponentialRampToValueAtTime(120, t + 0.1);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(g).connect(ctx.destination); osc.start(t); osc.stop(t + 0.12);
  } catch {}
}
function playStalemateSound() {
  try { const ctx = ensureAudioCtx(); const t = ctx.currentTime;
    [440, 392, 349].forEach((freq, i) => { const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
      const g = ctx.createGain(); const start = t + i * 0.12; g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(0.2, start + 0.01); g.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(g).connect(ctx.destination); osc.start(start); osc.stop(start + 0.35); });
  } catch {}
}

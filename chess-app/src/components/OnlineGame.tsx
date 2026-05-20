import { useState, useCallback, useEffect, useRef } from 'react';
import { useGameWebSocket } from '../context/GameWebSocketContext';
import { useAuth } from '../context/AuthContext';
import Board from './Board';
import Clock from './Clock';
import MoveHistory from './MoveHistory';
import CapturedPieces from './CapturedPieces';
import EvalBar from './EvalBar';
import { getLegalMoves, colorOf, type Coord, type ChessMove, type GameStatus } from '../engine';

interface OnlineGameProps {
  onBackToLobby: () => void;
}

export default function OnlineGame({ onBackToLobby }: OnlineGameProps) {
  const { user } = useAuth();
  const {
    onlineGame,
    sendMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    formatTime,
  } = useGameWebSocket();

  const [board, setBoard] = useState<number[][]>(() => Array.from({ length: 8 }, () => Array(8).fill(0)));
  const [selectedSquare, setSelectedSquare] = useState<Coord | null>(null);
  const [legalMovesForSelected, setLegalMovesForSelected] = useState<ChessMove[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameStatus, setGameStatus] = useState<'normal' | 'check' | 'checkmate' | 'stalemate' | 'white_time_win' | 'black_time_win'>('normal');
  const [capturedByWhite, setCapturedByWhite] = useState<number[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<number[]>([]);
  const [enPassantTarget, setEnPassantTarget] = useState<Coord | null>(null);
  const [castlingRights, setCastlingRights] = useState({ wK: true, wQ: true, bK: true, bQ: true });
  const [lastMove, setLastMove] = useState<ChessMove | null>(null);
  const [drawOffered, setDrawOffered] = useState(false);
  const [drawReceived, setDrawReceived] = useState(false);
  const [notification, setNotification] = useState('');

  const myColor = useRef<'white' | 'black' | null>(null);

  // Parse FEN to board
  useEffect(() => {
    if (!onlineGame || !onlineGame.fen) return;
    const newBoard = parseFENBoard(onlineGame.fen);
    setBoard(newBoard);

    // Determine my color from playerColor or from player IDs
    console.log('[OnlineGame] useEffect: playerColor=', onlineGame.playerColor, 'user.id=', user?.id, 'white.id=', onlineGame.white?.id, 'black.id=', onlineGame.black?.id);
    if (onlineGame.playerColor) {
      myColor.current = onlineGame.playerColor;
      console.log('[OnlineGame] Set myColor from playerColor:', myColor.current);
    } else if (user && onlineGame.white && onlineGame.black) {
      myColor.current = onlineGame.white.id === user.id ? 'white' : 'black';
      console.log('[OnlineGame] Set myColor from user id match:', myColor.current);
    } else {
      console.warn('[OnlineGame] Could not determine myColor! playerColor=', onlineGame.playerColor, 'user=', user?.id);
    }
    console.log('[OnlineGame] Final myColor.current:', myColor.current);

    // Parse move history from FEN is complex; use a simpler approach
    // We'll track moves as they come
  }, [onlineGame?.fen, user?.id, onlineGame?.white?.id, onlineGame?.black?.id, onlineGame?.playerColor]);

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
  const canMove = !gameOver && isMyTurn && onlineGame?.status === 'playing';

  const handleSelectSquare = useCallback((row: number, col: number) => {
    if (gameOver) return;
    if (!myColor.current) return;
    if (!canMove) return; // Block interaction when it's not my turn

    const piece = board[row]?.[col];
    const isMyPiece = piece !== undefined && piece !== 0 &&
      (myColor.current === 'white' ? (piece >= 1 && piece <= 6) : (piece >= 7 && piece <= 12));

    if (selectedSquare) {
      // Check if this is a legal move target
      const isLegalTarget = legalMovesForSelected.some(m => m.to.row === row && m.to.col === col);
      if (isLegalTarget) {
        const uci = `${String.fromCharCode(97 + selectedSquare.col)}${8 - selectedSquare.row}${String.fromCharCode(97 + col)}${8 - row}`;
        if (onlineGame?.gameId) {
          sendMove(uci, onlineGame.gameId);
        }
      }
      setSelectedSquare(null);
      setLegalMovesForSelected([]);
      return;
    }

    // Select a piece — compute legal moves
    if (isMyPiece) {
      setSelectedSquare({ row, col });
      const moveContext = {
        board,
        turn: onlineGame?.turn ?? 'w',
        selectedSquare: null,
        legalMovesForSelected: [],
        lastMove: null,
        moveHistory: [],
        capturedByWhite: [],
        capturedByBlack: [],
        gameOver: false,
        gameStatus: 'normal' as GameStatus,
        enPassantTarget: enPassantTarget,
        castlingRights: castlingRights,
        halfmoveClock: 0,
        fullmoveNumber: 1,
      } as any;
      const moves = getLegalMoves(moveContext, row, col);
      setLegalMovesForSelected(moves);
    }
  }, [board, selectedSquare, legalMovesForSelected, gameOver, canMove, onlineGame?.gameId, onlineGame?.turn, enPassantTarget, castlingRights, sendMove]);

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
    setDrawReceived(false);
  }, [onlineGame?.gameId, declineDraw]);

  const whiteName = onlineGame?.white?.displayName || 'White';
  const blackName = onlineGame?.black?.displayName || 'Black';

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
    <div id="app" style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
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
      {drawReceived && (
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

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* Left sidebar */}
        <div className="sidebar-left" style={{ width: '180px' }}>
          <EvalBar eval={null} engineStatus="unavailable" />
          <CapturedPieces capturedByWhite={capturedByWhite} capturedByBlack={capturedByBlack} />
        </div>

        {/* Main column */}
        <div className="main-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Clock
            color="black"
            name={blackName}
            timeFormatted={formatTime(onlineGame?.blackTime ?? 0)}
            isActive={onlineGame?.turn === 'b' && onlineGame?.status === 'playing'}
            icon="♚"
          />

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

          <Board
            state={{
              board,
              turn: onlineGame?.turn ?? 'w',
              selectedSquare,
              legalMovesForSelected,
              lastMove,
              moveHistory: [],
              capturedByWhite,
              capturedByBlack,
              gameOver,
              gameStatus,
              enPassantTarget,
              castlingRights,
            }}
            onSelectSquare={handleSelectSquare}
          />

          <Clock
            color="white"
            name={whiteName}
            timeFormatted={formatTime(onlineGame?.whiteTime ?? 0)}
            isActive={onlineGame?.turn === 'w' && onlineGame?.status === 'playing'}
            icon="♔"
          />

          {/* Controls */}
          <div style={{
            display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {!gameOver && onlineGame?.status === 'playing' && (
              <>
                <button className="btn" onClick={handleResign} style={{ background: '#f38ba8' }}>
                  Resign
                </button>
                {!drawOffered && !drawReceived && canMove && (
                  <button className="btn" onClick={handleDrawOffer}>
                    Draw
                  </button>
                )}
              </>
            )}
            <button className="btn" onClick={onBackToLobby}>
              Back to Lobby
            </button>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="sidebar-right" style={{ width: '200px' }}>
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0 }}>Moves</h3>
              <button className="btn" onClick={handleSavePGN} style={{ padding: '4px 10px', fontSize: '12px' }}>
                Save PGN
              </button>
            </div>
            <MoveHistory moves={onlineGame?.moveHistory ?? []} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== Helpers =====================
function parseFENBoard(fen: string): number[][] {
  const board: number[][] = [];
  const [pieceRow] = fen.split(' ');
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

  return board;
}

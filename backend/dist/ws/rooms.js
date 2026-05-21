import { query } from '../db/index.js';
import { recordGameResult } from '../services/gameHistoryService.js';
import { createInitialState, getLegalMoves, applyMoveToBoard, cloneState, PIECE_TYPE, colorOf, FILES, RANKS, rowColToFileRank, generateFEN, } from '../engine/index.js';
const DISCONNECT_TIMEOUT = 30_000; // 30 seconds grace period
export class GameRoom {
    state;
    gameContext;
    constructor(gameId, whiteTime, blackTime, increment) {
        this.state = {
            gameId,
            white: null,
            black: null,
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            turn: 'w',
            status: 'waiting',
            timeControl: whiteTime,
            increment,
            moveNumber: 1,
            whiteTime,
            blackTime,
            lastMove: null,
            clockInterval: null,
            drawOfferFrom: null,
            createdAt: Date.now(),
            capturedByWhite: [],
            capturedByBlack: [],
            moveHistory: [],
        };
        this.gameContext = createInitialState();
    }
    setPlayer(color, player) {
        if (color === 'white')
            this.state.white = player;
        else
            this.state.black = player;
        // Start game when both players are present
        if (this.state.white && this.state.black && this.state.status === 'waiting') {
            this.start();
        }
    }
    getPlayer(color) {
        return color === 'white' ? this.state.white : this.state.black;
    }
    start() {
        this.state.status = 'playing';
        this.startClock();
    }
    startClock() {
        if (this.state.clockInterval)
            return;
        this.state.clockInterval = setInterval(() => {
            if (this.state.status !== 'playing')
                return;
            if (this.state.turn === 'w') {
                this.state.whiteTime--;
                if (this.state.whiteTime <= 0) {
                    this.state.whiteTime = 0;
                    this.endGame('0-1', 'timeout');
                }
            }
            else {
                this.state.blackTime--;
                if (this.state.blackTime <= 0) {
                    this.state.blackTime = 0;
                    this.endGame('1-0', 'timeout');
                }
            }
            if (this.state.status === 'playing') {
                this.broadcast(this.buildGameStateMessage());
            }
        }, 1000);
    }
    stopClock() {
        if (this.state.clockInterval) {
            clearInterval(this.state.clockInterval);
            this.state.clockInterval = null;
        }
    }
    makeMove(playerColor, uci) {
        if (this.state.status !== 'playing') {
            return { success: false, message: 'Game is not active' };
        }
        // Verify it's this player's turn
        const expectedColor = playerColor === 'white' ? 'w' : 'b';
        if (this.state.turn !== expectedColor) {
            return { success: false, message: "It's not your turn" };
        }
        // Parse the UCI move
        if (uci.length < 4) {
            return { success: false, message: 'Invalid move format' };
        }
        const fromFile = uci.charCodeAt(0) - 97;
        const fromRank = 8 - parseInt(uci[1], 10);
        const toFile = uci.charCodeAt(2) - 97;
        const toRank = 8 - parseInt(uci[3], 10);
        if (fromFile < 0 || fromFile > 7 ||
            fromRank < 0 || fromRank > 7 ||
            toFile < 0 || toFile > 7 ||
            toRank < 0 || toRank > 7) {
            return { success: false, message: 'Invalid square coordinates' };
        }
        const sourcePiece = this.gameContext.board[fromRank]?.[fromFile] ?? 0;
        if (sourcePiece === 0 || colorOf(sourcePiece) !== expectedColor) {
            return { success: false, message: 'Illegal move' };
        }
        // Deep clone game context for validation
        const cloned = cloneState(this.gameContext);
        // Find legal moves for the source square
        const legalMoves = getLegalMoves(cloned, fromRank, fromFile);
        const matchingMove = legalMoves.find((m) => m.from.row === fromRank &&
            m.from.col === fromFile &&
            m.to.row === toRank &&
            m.to.col === toFile &&
            m.promotion === (uci.length >= 5 ? uci[4] : undefined));
        if (!matchingMove) {
            return { success: false, message: 'Illegal move' };
        }
        const capturedBefore = this.getCapturedPieceForMove(matchingMove);
        let san = this.buildSAN(matchingMove, capturedBefore);
        // Apply the move and track captured piece
        const capturedPiece = applyMoveToBoard(cloned.board, matchingMove);
        if (capturedPiece !== 0) {
            if (playerColor === 'white') {
                this.state.capturedByWhite = [...(this.state.capturedByWhite || []), capturedPiece];
            }
            else {
                this.state.capturedByBlack = [...(this.state.capturedByBlack || []), capturedPiece];
            }
        }
        // Switch turn
        cloned.turn = cloned.turn === 'w' ? 'b' : 'w';
        if (cloned.turn === 'w')
            cloned.fullmoveNumber++;
        // Apply increment
        if (playerColor === 'white') {
            this.state.whiteTime += this.state.increment;
        }
        else {
            this.state.blackTime += this.state.increment;
        }
        // Update state
        this.gameContext = cloned;
        this.state.turn = cloned.turn;
        this.state.lastMove = uci;
        this.state.moveNumber = cloned.fullmoveNumber;
        // Check game end conditions
        const allMoves = this.getAllLegalMoves(cloned.turn);
        if (allMoves.length === 0) {
            const inCheck = this.isInCheck(cloned.turn);
            if (inCheck) {
                san += '#';
                const winner = cloned.turn === 'w' ? '0-1' : '1-0';
                this.endGame(winner, 'checkmate');
            }
            else {
                this.endGame('1/2-1/2', 'stalemate');
            }
        }
        else if (this.isInCheck(cloned.turn)) {
            san += '+';
        }
        // Persist move to DB
        this.persistMove(uci, san, cloned.turn === 'w' ? 'b' : 'w');
        // Broadcast move to opponent
        const fromSq = rowColToFileRank(matchingMove.from.row, matchingMove.from.col);
        const toSq = rowColToFileRank(matchingMove.to.row, matchingMove.to.col);
        this.broadcastToOpponent(playerColor, {
            type: 'opponent_move',
            payload: { uci, san, from: fromSq, to: toSq },
            gameId: this.state.gameId,
        });
        // Broadcast updated game state to both players
        this.broadcast(this.buildGameStateMessage());
        return { success: true, message: 'Move accepted' };
    }
    getAllLegalMoves(color) {
        const all = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.gameContext.board[r][c] !== 0 && colorOf(this.gameContext.board[r][c]) === color) {
                    const moves = getLegalMoves(this.gameContext, r, c);
                    all.push(...moves);
                }
            }
        }
        return all;
    }
    isInCheck(color) {
        const kingColor = color === 'w' ? 6 : 12; // W_KING or B_KING
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.gameContext.board[r][c] === kingColor) {
                    const enemy = color === 'w' ? 'b' : 'w';
                    // Inline attack check for king
                    return this.isSquareAttackedBy(r, c, enemy);
                }
            }
        }
        return false;
    }
    getCapturedPieceForMove(move) {
        const piece = this.gameContext.board[move.from.row][move.from.col];
        if (move.enPassant) {
            const capturedRow = colorOf(piece) === 'w' ? move.to.row + 1 : move.to.row - 1;
            return this.gameContext.board[capturedRow]?.[move.to.col] ?? 0;
        }
        return this.gameContext.board[move.to.row]?.[move.to.col] ?? 0;
    }
    buildSAN(move, capturedPiece) {
        const piece = this.gameContext.board[move.from.row][move.from.col];
        const pieceType = PIECE_TYPE[piece];
        const toSq = rowColToFileRank(move.to.row, move.to.col);
        if (move.castle === 'K')
            return 'O-O';
        if (move.castle === 'Q')
            return 'O-O-O';
        const isCapture = capturedPiece !== 0 || move.enPassant;
        if (pieceType === 'p') {
            return `${isCapture ? `${FILES[move.from.col]}x` : ''}${toSq}${move.promotion ? `=${move.promotion.toUpperCase()}` : ''}`;
        }
        const candidates = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (r === move.from.row && c === move.from.col)
                    continue;
                const candidatePiece = this.gameContext.board[r][c];
                if (candidatePiece === 0 || colorOf(candidatePiece) !== colorOf(piece))
                    continue;
                if (PIECE_TYPE[candidatePiece] !== pieceType)
                    continue;
                const context = cloneState(this.gameContext);
                candidates.push(...getLegalMoves(context, r, c).filter((candidate) => candidate.to.row === move.to.row && candidate.to.col === move.to.col));
            }
        }
        let disambiguation = '';
        if (candidates.length > 0) {
            const sameFile = candidates.some((candidate) => candidate.from.col === move.from.col);
            const sameRank = candidates.some((candidate) => candidate.from.row === move.from.row);
            if (!sameFile)
                disambiguation = FILES[move.from.col];
            else if (!sameRank)
                disambiguation = RANKS[move.from.row];
            else
                disambiguation = rowColToFileRank(move.from.row, move.from.col);
        }
        return `${pieceType.toUpperCase()}${disambiguation}${isCapture ? 'x' : ''}${toSq}`;
    }
    isSquareAttackedBy(row, col, byColor) {
        const { board } = this.gameContext;
        // Pawn attacks
        if (byColor === 'w') {
            if (row + 1 < 8) {
                if (col - 1 >= 0 && board[row + 1][col - 1] === 1)
                    return true; // W_PAWN
                if (col + 1 < 8 && board[row + 1][col + 1] === 1)
                    return true;
            }
        }
        else {
            if (row - 1 >= 0) {
                if (col - 1 >= 0 && board[row - 1][col - 1] === 7)
                    return true; // B_PAWN
                if (col + 1 < 8 && board[row - 1][col + 1] === 7)
                    return true;
            }
        }
        // Knight attacks
        const knightPiece = byColor === 'w' ? 2 : 8;
        for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
            const nr = row + dr, nc = col + dc;
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === knightPiece)
                return true;
        }
        // King attacks
        const kingPiece = byColor === 'w' ? 6 : 12;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0)
                    continue;
                const nr = row + dr, nc = col + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === kingPiece)
                    return true;
            }
        }
        // Sliding pieces
        const rPiece = byColor === 'w' ? 4 : 10;
        const bPiece = byColor === 'w' ? 3 : 9;
        const qPiece = byColor === 'w' ? 5 : 11;
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            let nr = row + dr, nc = col + dc;
            while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                if (board[nr][nc] !== 0) {
                    if (board[nr][nc] === rPiece || board[nr][nc] === qPiece)
                        return true;
                    break;
                }
                nr += dr;
                nc += dc;
            }
        }
        for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            let nr = row + dr, nc = col + dc;
            while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                if (board[nr][nc] !== 0) {
                    if (board[nr][nc] === bPiece || board[nr][nc] === qPiece)
                        return true;
                    break;
                }
                nr += dr;
                nc += dc;
            }
        }
        return false;
    }
    async persistMove(uci, san, playedBy) {
        try {
            await query('INSERT INTO moves (game_id, move_number, uci_move, san, played_by) VALUES ($1, $2, $3, $4, $5)', [this.state.gameId, this.state.moveNumber, uci, san, playedBy]);
        }
        catch (err) {
            console.error('[Room] Failed to persist move:', err);
        }
        // Track SAN in room state for frontend broadcast
        this.state.moveHistory = [...this.state.moveHistory, san];
    }
    resign(playerColor) {
        const winner = playerColor === 'white' ? '0-1' : '1-0';
        this.endGame(winner, 'resign');
    }
    acceptDraw() {
        this.endGame('1/2-1/2', 'draw');
    }
    endGame(result, reason) {
        this.stopClock();
        this.state.status = 'finished';
        // Persist game result
        this.persistGameResult(result, reason);
        // Broadcast game over to both players
        const gameOverMsg = {
            type: 'game_over',
            payload: { result, reason, fen: this.state.fen },
            gameId: this.state.gameId,
        };
        this.broadcast(gameOverMsg);
    }
    async persistGameResult(result, reason) {
        try {
            await query('UPDATE games SET status = $1, result = $2, finished_at = now() WHERE id = $3', ['finished', result, this.state.gameId]);
            await this.persistRatedGameHistory(result);
        }
        catch (err) {
            console.error('[Room] Failed to persist game result:', err);
        }
    }
    async persistRatedGameHistory(result) {
        if (!this.state.white || !this.state.black)
            return;
        const ratings = await query('SELECT id, elo_rating FROM users WHERE id = ANY($1::uuid[])', [[this.state.white.id, this.state.black.id]]);
        const ratingById = new Map(ratings.rows.map((row) => [row.id, row.elo_rating]));
        const whiteResult = result === '1-0' ? 'win' : result === '0-1' ? 'loss' : 'draw';
        const blackResult = result === '0-1' ? 'win' : result === '1-0' ? 'loss' : 'draw';
        const duration = Math.max(0, Math.round((Date.now() - this.state.createdAt) / 1000));
        const moveCount = this.state.moveHistory.length;
        const whiteElo = ratingById.get(this.state.white.id) ?? 1200;
        const blackElo = ratingById.get(this.state.black.id) ?? 1200;
        await recordGameResult(this.state.white.id, this.state.gameId, this.state.black.displayName || this.state.black.username, blackElo, 'w', whiteResult, moveCount, duration);
        await recordGameResult(this.state.black.id, this.state.gameId, this.state.white.displayName || this.state.white.username, whiteElo, 'b', blackResult, moveCount, duration);
    }
    buildGameStateMessage() {
        return {
            type: 'game_state',
            payload: {
                gameId: this.state.gameId,
                fen: generateFEN(this.gameContext.board, this.gameContext.turn, this.gameContext.castlingRights, this.gameContext.enPassantTarget, this.gameContext.halfmoveClock, this.gameContext.fullmoveNumber),
                turn: this.state.turn,
                whiteTime: this.state.whiteTime,
                blackTime: this.state.blackTime,
                whiteIncrement: this.state.increment,
                blackIncrement: this.state.increment,
                moveNumber: this.state.moveNumber,
                status: this.state.status,
                whitePlayer: this.state.white ? {
                    id: this.state.white.id,
                    username: this.state.white.username,
                    displayName: this.state.white.displayName,
                } : null,
                blackPlayer: this.state.black ? {
                    id: this.state.black.id,
                    username: this.state.black.username,
                    displayName: this.state.black.displayName,
                } : null,
                lastMove: this.state.lastMove || undefined,
                capturedByWhite: this.state.capturedByWhite,
                capturedByBlack: this.state.capturedByBlack,
                moveHistory: this.state.moveHistory,
            },
            gameId: this.state.gameId,
        };
    }
    broadcastToOpponent(playerColor, message) {
        const opponent = playerColor === 'white' ? this.state.black : this.state.white;
        if (opponent?.ws.readyState === 1) { // OPEN
            opponent.ws.send(JSON.stringify(message));
        }
    }
    broadcast(message) {
        const data = JSON.stringify(message);
        if (this.state.white?.ws.readyState === 1) {
            this.state.white.ws.send(data);
        }
        if (this.state.black?.ws.readyState === 1) {
            this.state.black.ws.send(data);
        }
    }
    handleDisconnect(playerColor) {
        const player = this.getPlayer(playerColor);
        if (!player)
            return;
        player.connected = false;
        player.disconnectTimer = setTimeout(() => {
            // Timeout expired — forfeit
            const winner = playerColor === 'white' ? 'black' : 'white';
            this.endGame(winner === 'white' ? '1-0' : '0-1', 'timeout');
            // Notify the other player
            const opponentColor = winner === 'white' ? 'white' : 'black';
            const opponent = this.getPlayer(opponentColor);
            if (opponent?.ws.readyState === 1) {
                opponent.ws.send(JSON.stringify({
                    type: 'opponent_disconnected',
                    payload: { message: 'Opponent disconnected and timed out. You win!', winner: opponentColor },
                }));
            }
        }, DISCONNECT_TIMEOUT);
        // Notify opponent
        const opponentColor = playerColor === 'white' ? 'black' : 'white';
        const opponent = this.getPlayer(opponentColor);
        if (opponent?.ws.readyState === 1) {
            opponent.ws.send(JSON.stringify({
                type: 'opponent_disconnected',
                payload: { message: 'Opponent disconnected. You have 30 seconds to wait.', winner: opponentColor },
            }));
        }
    }
    handleReconnect(playerColor, ws) {
        const player = this.getPlayer(playerColor);
        if (!player)
            return;
        player.ws = ws;
        player.connected = true;
        if (player.disconnectTimer) {
            clearTimeout(player.disconnectTimer);
            player.disconnectTimer = null;
        }
        // Send current game state
        ws.send(JSON.stringify(this.buildGameStateMessage()));
        // Notify opponent
        const opponentColor = playerColor === 'white' ? 'black' : 'white';
        const opponent = this.getPlayer(opponentColor);
        if (opponent?.ws.readyState === 1) {
            opponent.ws.send(JSON.stringify({
                type: 'opponent_reconnected',
                payload: { message: 'Opponent has reconnected.' },
            }));
        }
    }
    cleanup() {
        this.stopClock();
        if (this.state.white?.disconnectTimer)
            clearTimeout(this.state.white.disconnectTimer);
        if (this.state.black?.disconnectTimer)
            clearTimeout(this.state.black.disconnectTimer);
    }
}
//# sourceMappingURL=rooms.js.map
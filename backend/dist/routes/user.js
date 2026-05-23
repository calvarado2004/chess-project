import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { getPublicUser, getCurrentUser, updateDisplayName, updateAvatar } from '../services/userService.js';
import { getELOStats, getGameHistory, recordStockfishGameResult } from '../services/gameHistoryService.js';
const router = Router();
// GET /api/users/me — Current user profile (requires auth)
router.get('/me', authenticate, async (req, res) => {
    if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }
    const user = await getCurrentUser(req);
    res.json(user);
});
// PATCH /api/users/me — Update display name (requires auth)
router.patch('/me', authenticate, validate(z.object({
    displayName: z.string().min(1).max(50).optional(),
    avatar: z.string().max(50).optional(),
})), async (req, res) => {
    if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }
    const { displayName, avatar } = req.body;
    let user;
    if (avatar !== undefined) {
        user = await updateAvatar(req.userId, avatar);
    }
    else if (displayName !== undefined) {
        user = await updateDisplayName(req.userId, displayName);
    }
    else {
        user = await getCurrentUser(req);
    }
    res.json(user);
});
// GET /api/users/me/elo — Current user ELO stats (requires auth)
router.get('/me/elo', authenticate, async (req, res) => {
    if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }
    const stats = await getELOStats(req.userId);
    res.json(stats);
});
// GET /api/users/me/history — Current user game history (requires auth)
router.get('/me/history', authenticate, async (req, res) => {
    if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }
    const limit = Math.min(parseInt(req.query.limit) || 50, 50);
    const history = await getGameHistory(req.userId, limit);
    res.json(history);
});
// POST /api/users/me/history/stockfish — Record a completed local Stockfish game
router.post('/me/history/stockfish', authenticate, validate(z.object({
    stockfishElo: z.number().int().min(500).max(2400),
    playerColor: z.enum(['w', 'b']),
    result: z.enum(['win', 'loss', 'draw']),
    moveCount: z.number().int().min(0).max(1000),
    gameDuration: z.number().int().min(0).max(86400),
})), async (req, res) => {
    if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }
    const stats = await recordStockfishGameResult(req.userId, req.body);
    res.status(201).json(stats);
});
// GET /api/users/:id — Public profile (must be last to avoid matching /me)
router.get('/:userId', optionalAuth, async (req, res) => {
    const user = await getPublicUser(String(req.params.userId));
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    res.json(user);
});
export default router;
//# sourceMappingURL=user.js.map
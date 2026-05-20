import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { getPublicUser, getCurrentUser, updateDisplayName, updateAvatar } from '../services/userService.js';
import { getELOStats, getGameHistory } from '../services/gameHistoryService.js';

const router = Router();

// GET /api/users/me — Current user profile (requires auth)
router.get('/me', authenticate, async (req: AuthRequest, res) => {
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
})), async (req: AuthRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const { displayName, avatar } = req.body;

  let user;
  if (avatar !== undefined) {
    user = await updateAvatar(req.userId, avatar);
  } else if (displayName !== undefined) {
    user = await updateDisplayName(req.userId, displayName);
  } else {
    user = await getCurrentUser(req);
  }
  res.json(user);
});

// GET /api/users/me/elo — Current user ELO stats (requires auth)
router.get('/me/elo', authenticate, async (req: AuthRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const stats = await getELOStats(req.userId);
  res.json(stats);
});

// GET /api/users/me/history — Current user game history (requires auth)
router.get('/me/history', authenticate, async (req: AuthRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const history = await getGameHistory(req.userId, limit);
  res.json(history);
});

// GET /api/users/:id — Public profile (must be last to avoid matching /me)
router.get('/:userId', optionalAuth, async (req: AuthRequest, res) => {
  const user = await getPublicUser(String(req.params.userId));
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

export default router;

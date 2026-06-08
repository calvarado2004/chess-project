import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { query } from '../db/index.js';
const router = Router();
// ── Public routes ──────────────────────────────────────────────────────────
// GET /api/theory/categories — Returns the 3 theory categories
router.get('/categories', (_req, res) => {
    const categories = [
        { id: 'openings', label: 'Openings', icon: '♟' },
        { id: 'middlegame', label: 'Middlegame', icon: '♞' },
        { id: 'endings', label: 'Endings', icon: '♚' },
        { id: 'fundamentals', label: 'Fundamentals & Tips', icon: '💡' },
    ];
    res.json(categories);
});
// GET /api/theory/lessons — Returns lesson summaries
router.get('/lessons', async (_req, res) => {
    try {
        const result = await query(`SELECT id, title, category, difficulty, estimated_minutes AS estimatedMinutes,
              key_concepts
       FROM theory_lessons
       ORDER BY category, difficulty, title`);
        const lessons = result.rows.map((row) => ({
            id: row.id,
            title: row.title,
            category: row.category,
            difficulty: row.difficulty,
            estimatedMinutes: row.estimatedMinutes,
            keyConcepts: JSON.parse(row.key_concepts),
        }));
        res.json(lessons);
    }
    catch (error) {
        console.error('[THEORY] Error fetching lessons:', error);
        res.status(500).json({ error: 'Failed to fetch lessons' });
    }
});
// GET /api/theory/lessons/:id — Returns full lesson detail
router.get('/lessons/:id', async (req, res) => {
    try {
        const result = await query(`SELECT id, title, category, difficulty, description,
              estimated_minutes AS estimatedMinutes,
              key_concepts, content
       FROM theory_lessons
       WHERE id = $1`, [req.params.id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Lesson not found' });
            return;
        }
        const row = result.rows[0];
        const lesson = {
            id: row.id,
            title: row.title,
            category: row.category,
            difficulty: row.difficulty,
            description: row.description,
            estimatedMinutes: row.estimatedMinutes,
            keyConcepts: JSON.parse(row.key_concepts),
            content: JSON.parse(row.content),
        };
        res.json(lesson);
    }
    catch (error) {
        console.error('[THEORY] Error fetching lesson:', error);
        res.status(500).json({ error: 'Failed to fetch lesson' });
    }
});
// ── Protected routes (require authentication) ──────────────────────────────
// POST /api/theory/progress — Save or upsert user progress for a lesson
router.post('/progress', authenticate, validate(z.object({
    lessonId: z.string().min(1).max(50),
    completed: z.boolean().optional(),
    lastPositionIndex: z.number().int().min(0).optional(),
    exerciseScore: z.number().int().min(0).optional(),
})), async (req, res) => {
    if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }
    try {
        const { lessonId, completed, lastPositionIndex, exerciseScore } = req.body;
        const completedAt = completed ? new Date().toISOString() : null;
        const result = await query(`INSERT INTO theory_progress (user_id, lesson_id, completed, last_position_index, exercise_score, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, lesson_id)
         DO UPDATE SET
           completed = EXCLUDED.completed,
           last_position_index = EXCLUDED.last_position_index,
           exercise_score = EXCLUDED.exercise_score,
           completed_at = EXCLUDED.completed_at,
           updated_at = now()
         RETURNING id, user_id, lesson_id, completed, last_position_index, exercise_score, completed_at, updated_at`, [req.userId, lessonId, completed ?? false, lastPositionIndex ?? 0, exerciseScore ?? 0, completedAt]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('[THEORY] Error saving progress:', error);
        res.status(500).json({ error: 'Failed to save progress' });
    }
});
// GET /api/theory/progress — Get all theory progress for the current user
router.get('/progress', authenticate, async (req, res) => {
    if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }
    try {
        const result = await query(`SELECT tp.id, tp.lesson_id AS lessonId, tp.completed,
              tp.last_position_index AS lastPositionIndex,
              tp.exercise_score AS exerciseScore,
              tp.completed_at AS completedAt,
              tp.updated_at AS updatedAt,
              tl.title AS lessonTitle,
              tl.category AS lessonCategory
       FROM theory_progress tp
       JOIN theory_lessons tl ON tl.id = tp.lesson_id
       WHERE tp.user_id = $1
       ORDER BY tp.updated_at DESC`, [req.userId]);
        const progress = result.rows.map((row) => ({
            id: row.id,
            lessonId: row.lessonId,
            lessonTitle: row.lessonTitle,
            lessonCategory: row.lessonCategory,
            completed: row.completed,
            lastPositionIndex: row.lastPositionIndex,
            exerciseScore: row.exerciseScore,
            completedAt: row.completedAt,
            updatedAt: row.updatedAt,
        }));
        res.json(progress);
    }
    catch (error) {
        console.error('[THEORY] Error fetching progress:', error);
        res.status(500).json({ error: 'Failed to fetch progress' });
    }
});
// PUT /api/theory/progress/:lessonId — Update specific lesson progress
router.put('/progress/:lessonId', authenticate, validate(z.object({
    completed: z.boolean().optional(),
    lastPositionIndex: z.number().int().min(0).optional(),
    exerciseScore: z.number().int().min(0).optional(),
})), async (req, res) => {
    if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }
    try {
        const { lessonId } = req.params;
        const { completed, lastPositionIndex, exerciseScore } = req.body;
        const completedAt = completed ? new Date().toISOString() : null;
        const result = await query(`INSERT INTO theory_progress (user_id, lesson_id, completed, last_position_index, exercise_score, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, lesson_id)
         DO UPDATE SET
           completed = COALESCE(EXCLUDED.completed, theory_progress.completed),
           last_position_index = COALESCE(EXCLUDED.last_position_index, theory_progress.last_position_index),
           exercise_score = COALESCE(EXCLUDED.exercise_score, theory_progress.exercise_score),
           completed_at = COALESCE(EXCLUDED.completed_at, theory_progress.completed_at),
           updated_at = now()
         RETURNING id, user_id, lesson_id, completed, last_position_index, exercise_score, completed_at, updated_at`, [req.userId, lessonId, completed ?? false, lastPositionIndex ?? 0, exerciseScore ?? 0, completedAt]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('[THEORY] Error updating progress:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});
export default router;
//# sourceMappingURL=theory.js.map
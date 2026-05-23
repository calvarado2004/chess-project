import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
const BCRYPT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
async function hashPassword(password) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}
async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}
function getJwtExpiresIn(value, fallbackSeconds) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue)
        ? numericValue
        : (value || fallbackSeconds);
}
function getRefreshExpiryDate() {
    const expiresIn = getJwtExpiresIn(JWT_REFRESH_EXPIRES_IN, 604800);
    if (typeof expiresIn === 'number') {
        return new Date(Date.now() + expiresIn * 1000);
    }
    const match = String(expiresIn).match(/^(\d+)([smhd])$/);
    if (!match) {
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    const amount = Number(match[1]);
    const multiplier = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]];
    return new Date(Date.now() + amount * multiplier);
}
function generateAccessToken(user) {
    return jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: getJwtExpiresIn(JWT_EXPIRES_IN, 900) });
}
function generateRefreshToken(user) {
    return jwt.sign({ userId: user.id, username: user.username }, JWT_REFRESH_SECRET, { expiresIn: getJwtExpiresIn(JWT_REFRESH_EXPIRES_IN, 604800) });
}
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
// ===================== Registration =====================
export async function registerUser(username, email, password, displayName) {
    // Check uniqueness
    const existing = await query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (existing.rows.length > 0) {
        const existingUser = existing.rows[0];
        const check = await query('SELECT id FROM users WHERE username = $1', [username]);
        if (check.rows.length > 0) {
            throw new Error('Username already taken');
        }
        throw new Error('Email already registered');
    }
    const passwordHash = await hashPassword(password);
    const result = await query(`INSERT INTO users (username, email, password_hash, display_name, avatar)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username, email, display_name, avatar, elo_rating, elo_games, elo_wins, elo_losses, elo_draws, created_at`, [username, email, passwordHash, displayName || username, 'king.svg']);
    const user = result.rows[0];
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    // Store refresh token hash
    await query('INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [user.id, hashToken(refreshToken), getRefreshExpiryDate()]);
    return {
        user: {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            avatar: user.avatar || 'king.svg',
            elo_rating: user.elo_rating,
            elo_games: user.elo_games,
            elo_wins: user.elo_wins,
            elo_losses: user.elo_losses,
            elo_draws: user.elo_draws,
            created_at: user.created_at.toISOString(),
        },
        accessToken,
        refreshToken,
    };
}
// ===================== Login =====================
export async function loginUser(username, password) {
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
        throw new Error('Invalid credentials');
    }
    const user = result.rows[0];
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
        throw new Error('Invalid credentials');
    }
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    // Store refresh token hash
    await query('INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [user.id, hashToken(refreshToken), getRefreshExpiryDate()]);
    return {
        user: {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            avatar: user.avatar || 'king.svg',
            elo_rating: user.elo_rating,
            elo_games: user.elo_games,
            elo_wins: user.elo_wins,
            elo_losses: user.elo_losses,
            elo_draws: user.elo_draws,
            created_at: user.created_at.toISOString(),
        },
        accessToken,
        refreshToken,
    };
}
// ===================== Refresh Token =====================
export async function refreshAccessToken(refreshToken) {
    try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        // Verify token hash exists in DB
        const tokenHash = hashToken(refreshToken);
        const result = await query(`SELECT us.user_id, u.username
       FROM user_sessions us
       JOIN users u ON u.id = us.user_id
       WHERE us.token_hash = $1 AND us.expires_at > now()
       ORDER BY us.created_at DESC
       LIMIT 1`, [tokenHash]);
        if (result.rows.length === 0) {
            throw new Error('Invalid refresh token');
        }
        const user = result.rows[0];
        // Get full user data
        const userResult = await query('SELECT id, username, display_name, created_at FROM users WHERE id = $1', [user.user_id]);
        const userData = userResult.rows[0];
        const accessToken = generateAccessToken(userData);
        return { accessToken };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (message.includes('jwt expired') || message.includes('invalid')) {
            throw new Error('Refresh token expired');
        }
        throw err;
    }
}
// ===================== Logout =====================
export async function logoutUser(userId, refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await query('DELETE FROM user_sessions WHERE user_id = $1 AND token_hash = $2', [userId, tokenHash]);
}
// ===================== Profile =====================
export async function getPublicUser(userId) {
    const result = await query('SELECT id, username, display_name, avatar, elo_rating, elo_games, elo_wins, elo_losses, elo_draws, created_at FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0)
        return null;
    const row = result.rows[0];
    return {
        id: row.id,
        username: row.username,
        display_name: row.display_name,
        avatar: row.avatar || 'king.svg',
        elo_rating: row.elo_rating,
        elo_games: row.elo_games,
        elo_wins: row.elo_wins,
        elo_losses: row.elo_losses,
        elo_draws: row.elo_draws,
        created_at: row.created_at.toISOString(),
    };
}
export async function getCurrentUser(authReq) {
    if (!authReq.userId) {
        throw new Error('Not authenticated');
    }
    const result = await query('SELECT id, username, display_name, avatar, elo_rating, elo_games, elo_wins, elo_losses, elo_draws, created_at FROM users WHERE id = $1', [authReq.userId]);
    if (result.rows.length === 0) {
        throw new Error('User not found');
    }
    const row = result.rows[0];
    return {
        id: row.id,
        username: row.username,
        display_name: row.display_name,
        avatar: row.avatar || 'king.svg',
        elo_rating: row.elo_rating,
        elo_games: row.elo_games,
        elo_wins: row.elo_wins,
        elo_losses: row.elo_losses,
        elo_draws: row.elo_draws,
        created_at: row.created_at.toISOString(),
    };
}
export async function updateDisplayName(userId, displayName) {
    const result = await query('UPDATE users SET display_name = $1, updated_at = now() WHERE id = $2 RETURNING id, username, display_name, avatar, elo_rating, elo_games, elo_wins, elo_losses, elo_draws, created_at', [displayName, userId]);
    if (result.rows.length === 0) {
        throw new Error('User not found');
    }
    const row = result.rows[0];
    return {
        id: row.id,
        username: row.username,
        display_name: row.display_name,
        avatar: row.avatar || 'king.svg',
        elo_rating: row.elo_rating,
        elo_games: row.elo_games,
        elo_wins: row.elo_wins,
        elo_losses: row.elo_losses,
        elo_draws: row.elo_draws,
        created_at: row.created_at.toISOString(),
    };
}
export async function updateAvatar(userId, avatar) {
    // Validate avatar filename
    const validAvatars = [
        'king.svg', 'queen.svg', 'rook.svg', 'bishop.svg', 'knight.svg', 'pawn.svg',
        'king-black.svg', 'queen-black.svg', 'rook-black.svg', 'bishop-black.svg',
        'knight-black.svg', 'pawn-black.svg',
    ];
    if (!validAvatars.includes(avatar)) {
        throw new Error('Invalid avatar');
    }
    const result = await query('UPDATE users SET avatar = $1, updated_at = now() WHERE id = $2 RETURNING id, username, display_name, avatar, elo_rating, elo_games, elo_wins, elo_losses, elo_draws, created_at', [avatar, userId]);
    if (result.rows.length === 0) {
        throw new Error('User not found');
    }
    const row = result.rows[0];
    return {
        id: row.id,
        username: row.username,
        display_name: row.display_name,
        avatar: row.avatar,
        elo_rating: row.elo_rating,
        elo_games: row.elo_games,
        elo_wins: row.elo_wins,
        elo_losses: row.elo_losses,
        elo_draws: row.elo_draws,
        created_at: row.created_at.toISOString(),
    };
}
//# sourceMappingURL=userService.js.map
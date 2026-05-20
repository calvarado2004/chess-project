import { AuthRequest } from '../middleware/auth.js';
export interface UserRow {
    id: string;
    username: string;
    email: string;
    password_hash: string;
    display_name: string;
    avatar: string;
    elo_rating: number;
    elo_games: number;
    elo_wins: number;
    elo_losses: number;
    elo_draws: number;
    created_at: Date;
    updated_at: Date;
}
export interface PublicUser {
    id: string;
    username: string;
    display_name: string;
    avatar: string;
    elo_rating: number;
    elo_games: number;
    elo_wins: number;
    elo_losses: number;
    elo_draws: number;
    created_at: string;
}
export interface AuthPayload {
    userId: string;
    username: string;
}
export declare function registerUser(username: string, email: string, password: string, displayName?: string): Promise<{
    user: PublicUser;
    accessToken: string;
    refreshToken: string;
}>;
export declare function loginUser(username: string, password: string): Promise<{
    user: PublicUser;
    accessToken: string;
    refreshToken: string;
}>;
export declare function refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
}>;
export declare function logoutUser(userId: string, refreshToken: string): Promise<void>;
export declare function getPublicUser(userId: string): Promise<PublicUser | null>;
export declare function getCurrentUser(authReq: AuthRequest): Promise<PublicUser>;
export declare function updateDisplayName(userId: string, displayName: string): Promise<PublicUser>;
export declare function updateAvatar(userId: string, avatar: string): Promise<PublicUser>;
//# sourceMappingURL=userService.d.ts.map
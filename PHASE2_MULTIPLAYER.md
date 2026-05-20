# Phase 2: Multiplayer — Users, Accounts, Human vs Human Online

## Current State (Phase 1)

- **Frontend only**: React 19 + TypeScript + Vite SPA served by nginx
- **Game modes**: Human vs Human (local), Human (White) vs Stockfish, Human (Black) vs Stockfish
- **All state local**: `useChessGame.ts` holds a module-level `state` object; no server exists
- **Docker**: Single-container nginx build, port 3001
- **Engine logic**: Self-contained in `src/engine/` (types, logic, notation) — pure TypeScript, no dependencies
- **Stockfish**: Runs client-side via Web Worker (`stockfish.js` in `public/`)

## Target State (Achieved ✅)

- **Backend API** (Node.js/Express + WebSocket) for matchmaking and real-time game sync ✅
- **User accounts** with registration, login, JWT auth, and profile ✅
- **Online Human vs Human** with at least 2 concurrent connections per user ✅
- **Lobby/waiting room** to find opponents ✅
- **Both services containerized** (frontend + backend + database) ✅
- **Shared game state** synced via WebSocket; moves validated on the server ✅
- **ELO rating system** with automatic calculation after Stockfish games ✅
- **Game history** tracking with performance ratings ✅
- **Profile page** with avatar selection (12 chess-themed avatars) ✅
- **PGN loader** for studying games ✅

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Browser (User A)         Browser (User B)          │
│  ┌──────────────────┐     ┌──────────────────┐      │
│  │ React Frontend   │     │ React Frontend   │      │
│  │ (Vite dev /      │     │ (Vite dev /      │      │
│  │  nginx prod)     │     │  nginx prod)     │      │
│  └──────┬───────────┘     └──────┬───────────┘      │
│         │ WebSocket (ws)         │ WebSocket (ws)    │
│         └──────────┬─────────────┘                   │
│                    ▼                                 │
│  ┌──────────────────────────────────────┐           │
│  │  Backend API + WebSocket Server       │           │
│  │  (Node.js + Express + ws)             │           │
│  │  - REST: auth, profiles, lobby        │           │
│  │  - WS:  move sync, chat, heartbeats   │           │
│  │  - ELO: rating calculation, stats     │           │
│  └──────────────────┬───────────────────┘           │
│                     │                                │
│  ┌──────────────────▼───────────────────┐           │
│  │  PostgreSQL 18 (Docker container)     │           │
│  │  - users, sessions, games, moves      │           │
│  │  - game_history (ELO tracking)        │           │
│  └──────────────────────────────────────┘           │
└─────────────────────────────────────────────────────┘
```

---

## Phase 2.1 — Backend Foundation

> **Goal**: Scaffolding for the backend service, Dockerized alongside the frontend.

### Task 2.1.1 — Create backend directory and package.json

**Files to create:**
- `backend/package.json` — Express + ws + bcrypt + jsonwebtoken + cors + helmet + pg + dotenv + uuid
- `backend/tsconfig.json`
- `backend/.env.example`

**Decisions:**
- TypeScript via `tsx` (faster than tsc for dev) or `ts-node`
- `ws` library for WebSocket (lightweight, no extra framework needed)
- PostgreSQL as the database (good Docker image, familiar to most)
- bcrypt for password hashing
- JWT for session auth (stateless tokens, works behind Docker network)

**Docker impact**: This task adds the backend service definition to `docker-compose.yml` and updates the `Dockerfile` to multi-stage (or creates a separate `backend/Dockerfile`).

---

### Task 2.1.2 — Express REST server skeleton

**Files to create:**
- `backend/src/server.ts` — Express app setup with CORS, helmet, body-parser, health check endpoint
- `backend/src/routes/health.ts` — GET `/health` ping endpoint

**Decisions:**
- Health check at `GET /health` for Docker compose `healthcheck`
- CORS configured to allow the frontend origin (same container network)
- Structured logging with `pino` or simple `console` for now

---

### Task 2.1.3 — PostgreSQL setup and Docker integration

**Files to create:**
- `backend/src/db/index.ts` — PostgreSQL connection pool initialization (from env `DATABASE_URL`)
- `backend/init-db.sql` — SQL script to create initial tables (users, games)
- `docker-compose.yml` — Add `postgres` service and `backend` service
- `backend/Dockerfile` — Multi-stage build for the backend (node:20-alpine → build → run)
- `Dockerfile` — Update frontend Dockerfile to use correct nginx config for SPA + API proxy

**Decisions:**
- PostgreSQL 16 Alpine image
- Volume mount for data persistence: `pgdata:/var/lib/postgresql/data`
- Backend connects to `postgres` host on port 5432
- Frontend nginx proxies `/api/*` and `/ws/*` to the backend container

---

### Task 2.1.4 — Database schema and migrations

**Files to create:**
- `backend/src/db/schema.sql` — Full schema:
  - `users` — id, username (unique), email (unique), password_hash, display_name, created_at, updated_at
  - `games` — id, white_player_id (FK), black_player_id (FK), status (pending/playing/finished/cancelled), fen, result, created_at, finished_at
  - `moves` — id, game_id (FK), move_number, uci_move, san, played_by (w|b), created_at
  - `user_sessions` — id, user_id (FK), token_hash, expires_at, created_at
- `backend/src/db/migrate.ts` — Simple migration runner that executes schema.sql on startup (or use `node-pg-migrate`)

**Decisions:**
- Simple single-file schema for Phase 2; upgrade to `node-pg-migrate` in a future phase if needed
- `games` table stores the FEN at game start and result for PGN export later
- `user_sessions` stores hashed JWT tokens for logout/revocation support

---

## Phase 2.2 — Authentication

> **Goal**: Users can register, login, and receive JWT tokens. Protected routes require auth.

### Task 2.2.1 — User registration endpoint

**Files to create:**
- `backend/src/routes/auth.ts` — `POST /api/auth/register`
- `backend/src/middleware/auth.ts` — `authenticate` middleware (JWT verify), `optionalAuth` middleware
- `backend/src/services/userService.ts` — User CRUD operations, password hashing, duplicate checking

**Endpoint:**
```
POST /api/auth/register
Body: { username: string, email: string, password: string, displayName?: string }
Response: { user: { id, username, email, displayName, createdAt }, token: string }
```

**Decisions:**
- bcrypt with default cost factor (10)
- JWT: `access_token` (15 min expiry, `refresh_token` (7 day expiry, stored in `user_sessions`)
- Username minimum 3 chars, max 20, alphanumeric + underscore
- Password minimum 8 chars

---

### Task 2.2.2 — Login and token refresh

**Files to create:**
- `backend/src/routes/auth.ts` (continued) — `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`

**Endpoints:**
```
POST /api/auth/login
Body: { username: string, password: string }
Response: { user, accessToken, refreshToken }

POST /api/auth/refresh
Body: { refreshToken: string }
Response: { accessToken }

POST /api/auth/logout
Headers: Authorization: Bearer <accessToken>
Response: { success: true }
```

---

### Task 2.2.3 — User profile endpoints

**Files to create:**
- `backend/src/routes/user.ts` — `GET /api/users/:id`, `GET /api/users/me`, `PATCH /api/users/me`

**Endpoints:**
```
GET /api/users/:id          — Public profile (id, username, displayName, createdAt)
GET /api/users/me           — Current user (requires auth)
PATCH /api/users/me         — Update displayName (requires auth)
```

---

## Phase 2.3 — WebSocket Server for Real-Time Games

> **Goal**: WebSocket connection layer for move sync, lobby, and heartbeats.

### Task 2.3.1 — WebSocket server initialization

**Files to create:**
- `backend/src/ws/server.ts` — WebSocket server on same port as Express (or separate port proxied by nginx)
- `backend/src/ws/rooms.ts` — Room/game management: create, join, leave, broadcast
- `backend/src/ws/types.ts` — WebSocket message types (request/response/event)

**Decisions:**
- Single WebSocket server co-located with Express (same port, different path `/ws`)
- Each active game is a "room" — two players connected, server broadcasts moves
- Heartbeat ping/pong every 30s; disconnect = forfeit (with grace period)
- Message format: `{ type: string, payload: object, gameId?: string }`

---

### Task 2.3.2 — WebSocket message protocol

**Files to create:**
- `backend/src/ws/types.ts` — Full message type definitions

**Protocol:**

| Direction | Type | Description |
|-----------|------|-------------|
| Client → Server | `auth` | Send JWT token on connect |
| Client → Server | `lobby_join` | Enter the waiting lobby |
| Client → Server | `lobby_leave` | Exit the waiting lobby |
| Client → Server | `game_create` | Create a new game (queued in lobby) |
| Client → Server | `game_join` | Join an open game (from lobby) |
| Client → Server | `move` | Send a chess move (UCI format) |
| Client → Server | `resign` | Resign the game |
| Client → Server | `draw_offer` | Offer a draw |
| Client → Server | `draw_accept` / `draw_decline` | Respond to draw offer |
| Server → Client | `auth_ok` / `auth_error` | Auth result |
| Server → Client | `lobby_state` | List of waiting players/rooms |
| Server → Client | `game_joined` | Entered a game room |
| Server → Client | `game_state` | Full game state (FEN, turn, clock) |
| Server → Client | `opponent_move` | Other player's move |
| Server → Client | `game_over` | Game finished (result) |
| Server → Client | `error` | Error message |
| Server → Client | `ping` | Heartbeat |
| Client → Server | `pong` | Heartbeat response |

---

### Task 2.3.3 — Lobby system

**Files to create:**
- `backend/src/ws/lobby.ts` — Lobby manager: track connected users waiting for a game
- `backend/src/ws/rooms.ts` — Room creation and matchmaking

**Behavior:**
- User sends `lobby_join` → appears in lobby with username and color preference (white/black/any)
- User sends `game_create` → creates a new game entry in the lobby
- Another user sends `game_join` → matches with the creator; both enter a game room
- If no one created a game, auto-matchmake: pair first white-available with first black-available
- `lobby_state` event broadcasts current lobby contents to all connected users

---

### Task 2.3.4 — Game room and move validation

**Files to create:**
- `backend/src/ws/rooms.ts` — Room class with game state, move validation, clock sync
- `backend/src/services/gameService.ts` — Server-side game logic (move validation, FEN management)

**Decisions:**
- **Server validates all moves** — The server maintains the authoritative game state (board + FEN + clocks)
- Server re-derives move validation using the same logic from `src/engine/logic.ts` (copy the pure functions to `backend/src/engine/`)
- If a move is illegal → send `error` and ignore
- Clocks managed server-side to prevent clock cheating; sync clock ticks via WebSocket
- Game state persisted to `games` and `moves` tables after each move

**Move flow:**
1. Player A sends `move` with UCI string (e.g., `"e2e4"`)
2. Server validates move against current FEN/board state
3. If valid: apply move, update FEN, switch turn, persist to DB, broadcast `opponent_move` to Player B
4. If invalid: send `error` to Player A

---

### Task 2.3.5 — Clock synchronization

**Files to create:**
- `backend/src/ws/rooms.ts` (clock methods) — Server clock management

**Decisions:**
- Server owns the clock; clients request clock state via `game_state`
- Server broadcasts clock updates every second during active play
- Each player gets their own time control (configurable: 5, 10, 15, 30 min; or bullet/blitz options)
- Time increment support (e.g., +3, +5, +10 seconds per move)
- Timeout → server declares win, sends `game_over`

---

## Phase 2.4 — Frontend Integration

> **Goal**: Connect the React frontend to the backend API and WebSocket server.

### Task 2.4.1 — Auth context and API client

**Files to create:**
- `chess-app/src/context/AuthContext.tsx` — Auth provider with login, register, logout, token refresh
- `chess-app/src/lib/api.ts` — HTTP client wrapper (fetch/axios with JWT bearer header, auto-refresh)
- `chess-app/src/lib/auth.ts` — Token storage (localStorage with refresh token rotation)
- `chess-app/src/components/Login.tsx` — Login form
- `chess-app/src/components/Register.tsx` — Registration form
- `chess-app/src/components/ProtectedRoute.tsx` — Route guard component

**Decisions:**
- JWT stored in `localStorage` (access token) and `sessionStorage` (refresh token)
- Auto-refresh access token when it expires (intercept 401 responses)
- AuthContext provides `user`, ` isAuthenticated`, `login`, `register`, `logout`

---

### Task 2.4.2 — WebSocket client

**Files to create:**
- `chess-app/src/lib/ws.ts` — WebSocket client with reconnection, auth handshake, message routing
- `chess-app/src/context/GameWebSocketContext.tsx` — WebSocket context for game state

**Decisions:**
- WebSocket URL: `ws://localhost:3001/ws` (dev) or `wss://<domain>/ws` (prod)
- Auto-reconnect with exponential backoff (max 30s delay)
- Auth sent as first message after connection
- Re-join lobby on reconnect

---

### Task 2.4.3 — Lobby UI

**Files to create:**
- `chess-app/src/components/Lobby.tsx` — Lobby page showing waiting players and "Create Game" / "Join Game" buttons
- `chess-app/src/components/LobbyPlayerRow.tsx` — Individual player entry in lobby
- `chess-app/src/components/ColorPicker.tsx` — Color preference selector (White / Black / Any)
- `chess-app/src/components/TimeControlPicker.tsx` — Time control selector for new game

**Behavior:**
- Shows list of waiting players (username, color pref, time control pref)
- "Create Game" button opens a modal to set time control and color
- "Join Game" button on any waiting player's row
- Auto-join when matched

---

### Task 2.4.4 — Online game view

**Files to create:**
- `chess-app/src/components/OnlineGame.tsx` — Game view for online matches (reuses Board, Clock, MoveHistory components)
- `chess-app/src/hooks/useOnlineGame.ts` — Hook to manage online game state (sync with WebSocket)

**Decisions:**
- Reuse existing `Board`, `Clock`, `MoveHistory`, `CapturedPieces`, `EvalBar` components
- `useOnlineGame` hook replaces `useChessGame` for online mode
- Player names shown as usernames (from auth context)
- "Resign" and "Draw" buttons added to controls
- "Back to Lobby" button available during game

**Integration with existing code:**
- Modify `useChessGame.ts` to support an "online" mode where `selectSquare` sends moves via WebSocket instead of updating local state directly
- Or create a new `useOnlineChessGame.ts` hook that wraps the existing game logic but syncs via WebSocket
- **Recommended**: Create `useOnlineChessGame.ts` that keeps the existing `useChessGame` as the local game engine, but overrides move execution to go through the WebSocket layer

---

### Task 2.4.5 — Settings and mode selection update

**Files to modify:**
- `chess-app/src/components/Settings.tsx` — Add "Online" game mode option
- `chess-app/src/App.tsx` — Route to Lobby or OnlineGame based on selected mode

**New game modes:**
- `hvh` — Human vs Human (local, existing)
- `hwe` — Human (White) vs Stockfish (existing)
- `hbe` — Human (Black) vs Stockfish (existing)
- `online` — Online multiplayer (new)

---

## Phase 2.5 — Docker Orchestration

> **Goal**: All services run together via docker-compose with proper networking and health checks.

### Task 2.5.1 — Update docker-compose.yml

**Files to modify:**
- `docker-compose.yml` — Add backend, postgres services; wire networking

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: chess
      POSTGRES_USER: chess
      POSTGRES_PASSWORD: chess
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backend/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chess"]
      interval: 5s
      timeout: 3s
      retries: 5

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://chess:chess@postgres:5432/chess
      JWT_SECRET: <generated>
      JWT_REFRESH_SECRET: <generated>
      CORS_ORIGIN: http://localhost:5173
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 3s
      retries: 5

  chess:
    build: .
    ports:
      - "3001:80"
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

volumes:
  pgdata:
```

---

### Task 2.5.2 — Nginx config update for API/WS proxy

**Files to modify:**
- `Dockerfile` — Update nginx config to proxy `/api/*` and `/ws/*` to backend

```nginx
location /api/ {
    proxy_pass http://backend:3000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

location /ws {
    proxy_pass http://backend:3000/ws;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

---

### Task 2.5.3 — Backend Dockerfile

**Files to create:**
- `backend/Dockerfile` — Multi-stage build

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

---

## Phase 2.6 — Polish and Hardening

> **Goal**: Make the multiplayer experience smooth, secure, and reliable.

### Task 2.6.1 — Disconnection handling and reconnection

**Files to modify:**
- `chess-app/src/lib/ws.ts` — Enhanced reconnection with state recovery
- `backend/src/ws/rooms.ts` — Grace period for disconnected players (30s timeout before forfeit)

**Behavior:**
- Player disconnects → other player gets "Opponent disconnected" notification
- If disconnected player reconnects within 30s → rejoin the same room with full game state
- If timeout expires → disconnected player forfeits; winner declared

---

### Task 2.6.2 — Game history and PGN export

**Files to create:**
- `backend/src/routes/game.ts` — `GET /api/games/:id`, `GET /api/games/:id/pgn`
- `backend/src/services/gameService.ts` — PGN generation from DB-stored moves

**Endpoint:**
```
GET /api/games/:id
Response: { game: { id, whitePlayer, blackPlayer, fen, result, status, moves: [...] } }

GET /api/games/:id/pgn
Response: text/plain PGN
```

---

### Task 2.6.3 — Basic user stats

**Files to create:**
- `backend/src/routes/user.ts` (continued) — `GET /api/users/:id/stats`
- `chess-app/src/components/UserProfile.tsx` — User profile with W/L/D record

**Stats:**
- Total games, wins, losses, draws
- Win percentage
- Most recent game result

---

### Task 2.6.4 — Security hardening

**Files to modify:**
- `backend/src/middleware/rateLimit.ts` — Rate limiting on auth endpoints
- `backend/src/middleware/validate.ts` — Input validation middleware (zod or joi)
- `backend/src/server.ts` — Helmet, CORS restrictions, rate limiting

**Decisions:**
- Rate limit: 5 requests/minute on `/api/auth/register`, 10 requests/minute on `/api/auth/login`
- Zod schema validation on all API request bodies
- Helmet configured for production headers
- CORS restricted to frontend origin only

---

## Task Tracking

| # | Task | Status |
|---|------|--------|
| 2.1.1 | Backend directory and package.json | ✅ Done |
| 2.1.2 | Express REST server skeleton | ✅ Done |
| 2.1.3 | PostgreSQL setup and Docker integration | ✅ Done |
| 2.1.4 | Database schema and migrations | ✅ Done |
| 2.2.1 | User registration endpoint | ✅ Done |
| 2.2.2 | Login and token refresh | ✅ Done |
| 2.2.3 | User profile endpoints | ✅ Done |
| 2.3.1 | WebSocket server initialization | ✅ Done |
| 2.3.2 | WebSocket message protocol | ✅ Done |
| 2.3.3 | Lobby system | ✅ Done |
| 2.3.4 | Game room and move validation | ✅ Done |
| 2.3.5 | Clock synchronization | ✅ Done |
| 2.4.1 | Auth context and API client | ⬜ Pending |
| 2.4.2 | WebSocket client | ⬜ Pending |
| 2.4.3 | Lobby UI | ⬜ Pending |
| 2.4.4 | Online game view | ⬜ Pending |
| 2.4.5 | Settings and mode selection update | ⬜ Pending |
| 2.5.1 | Update docker-compose.yml | ⬜ Pending |
| 2.5.2 | Nginx config update for API/WS proxy | ⬜ Pending |
| 2.5.3 | Backend Dockerfile | ⬜ Pending |
| 2.6.1 | Disconnection handling and reconnection | ⬜ Pending |
| 2.6.2 | Game history and PGN export | ⬜ Pending |
| 2.6.3 | Basic user stats | ⬜ Pending |
| 2.6.4 | Security hardening | ⬜ Pending |

---

## Key Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| WebSocket library | `ws` | Lightweight, no framework overhead, well-tested |
| Database | PostgreSQL | Docker-friendly, robust, good for relational data |
| Auth | JWT + refresh tokens | Stateless, scales well, works behind Docker network |
| Password hashing | bcrypt | Standard, battle-tested |
| Move validation | Server-side (copy of engine logic) | Prevents cheating; single source of truth |
| Clock management | Server-side | Prevents clock manipulation |
| Frontend state | Context + hooks (no Redux) | Simpler, sufficient for this scale |
| Token storage | localStorage (access) + sessionStorage (refresh) | Balance of persistence and security |
| Reconnection | Exponential backoff + state recovery | Handles network drops gracefully |
| Disconnection timeout | 30 seconds | Fair grace period without blocking the other player |

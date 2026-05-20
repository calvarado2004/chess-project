# ♔ Chess Project

A full-featured chess application with online multiplayer, Stockfish engine integration, and user accounts.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser (User A)         Browser (User B)                          │
│  ┌──────────────────┐     ┌──────────────────┐                     │
│  │ React Frontend   │     │ React Frontend   │                     │
│  │ (Vite dev /      │     │ (Vite dev /      │                     │
│  │  nginx prod)     │     │  nginx prod)     │                     │
│  └──────┬───────────┘     └──────┬───────────┘                     │
│         │ WebSocket (ws)         │ WebSocket (ws)                   │
│         └──────────┬─────────────┘                                 │
│                    ▼                                               │
│  ┌──────────────────────────────────────┐                         │
│  │  Backend API + WebSocket Server       │                         │
│  │  (Node.js + Express + ws)             │                         │
│  │  - REST: auth, profiles, lobby        │                         │
│  │  - WS:  move sync, chat, heartbeats   │                         │
│  └──────────────────┬───────────────────┘                         │
│                     │                                               │
│  ┌──────────────────▼───────────────────┐                         │
│  │  PostgreSQL 18 (Docker container)     │                         │
│  │  - users, sessions, games, moves      │                         │
│  │  - game_history (ELO tracking)        │                         │
│  └──────────────────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite 8, react-router-dom |
| **Backend** | Node.js 20, Express, TypeScript, `ws` (WebSocket) |
| **Database** | PostgreSQL 18 |
| **Chess Engine** | Stockfish.js (client-side Web Worker) |
| **Containerization** | Docker, Docker Compose, Nginx (frontend proxy) |
| **Auth** | JWT (access + refresh tokens), bcrypt |

## Game Modes

- **Local Game** — Human vs Human on the same device
- **vs Stockfish** — Human (White/Black) vs Stockfish engine
- **Online Multiplayer** — Real-time Human vs Human with lobby, matchmaking, and move sync
- **PGN Study** — Load and replay games from PGN files

## User Features

- **Account System** — Registration, login, JWT authentication, profile management
- **Avatar Selection** — 12 chess-themed avatars (6 pieces × 2 styles)
- **ELO Rating** — Automatic ELO calculation after Stockfish games (K-factor: 32 for new players, 24 for established, 16 for 2000+)
- **Game History** — Full tracking of wins, losses, draws, performance ratings
- **Profile Page** — View and edit display name, avatar, and ELO stats

## Project Structure

```
chess-project/
├── chess-app/                 # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── Board.tsx      # Chess board with square interaction
│   │   │   ├── Clock.tsx      # Chess clock display
│   │   │   ├── Lobby.tsx      # Online lobby with matchmaking
│   │   │   ├── LocalGame.tsx  # Local/Stockfish game view
│   │   │   ├── OnlineGame.tsx # Online multiplayer game view
│   │   │   ├── PGNLoader.tsx  # PGN file/game loader
│   │   │   ├── Profile.tsx    # User profile with ELO stats
│   │   │   ├── Settings.tsx   # Game settings
│   │   │   └── ...
│   │   ├── context/           # React contexts (Auth, WebSocket)
│   │   ├── engine/            # Chess logic (types, logic, notation, PGN)
│   │   ├── hooks/             # Custom hooks (useChessGame)
│   │   ├── lib/               # API client, WebSocket client, auth utils
│   │   └── App.tsx            # Main app with routing
│   ├── public/
│   │   ├── avatars/           # Chess piece SVG avatars
│   │   └── stockfish.js       # Stockfish engine (Web Worker)
│   └── Dockerfile             # Multi-stage build (node → nginx)
│
├── backend/                   # Node.js backend
│   ├── src/
│   │   ├── db/                # PostgreSQL connection, migrations
│   │   ├── engine/            # Server-side chess logic (move validation)
│   │   ├── middleware/        # Auth, validation
│   │   ├── routes/            # REST API routes (auth, users)
│   │   ├── services/          # Business logic (users, game history, ELO)
│   │   ├── ws/                # WebSocket server (lobby, rooms, heartbeats)
│   │   └── server.ts          # Express app + WebSocket attachment
│   └── Dockerfile             # Multi-stage build (node → node)
│
├── docker-compose.yml         # Orchestration (postgres, backend, chess)
└── PHASE2_MULTIPLAYER.md      # Detailed phase plan with task tracking
```

## Docker Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| `chess` | nginx:alpine | 3001:80 | Frontend SPA + API/WS proxy |
| `backend` | node:20-alpine | 3000 | REST API + WebSocket server |
| `postgres` | postgres:18-alpine | 5432 | PostgreSQL database |

## OpenShift Deployment

All Kubernetes manifests live in `k8s/`. They target OpenShift with the `px-csi-db` StorageClass for Postgres persistence.

### Prerequisites

- `oc` CLI logged into your OpenShift cluster
- Portworx CSI driver installed (`px-csi-db` StorageClass available)
- Docker images built and pushed to your OpenShift image registry (or accessible)

### One-command deploy

```bash
oc apply -f k8s/00-namespace.yml
oc apply -f k8s/01-secret.yml
oc apply -f k8s/02-postgres.yml
oc apply -f k8s/03-backend.yml
oc apply -f k8s/04-frontend.yml
```

### Post-deploy steps

```bash
# Grant anyuid SCC to the default service account so Postgres can run as non-root
oc adm policy add-scc-to-user anyuid -z default -n chess-project

# Wait for Postgres to be ready (it needs time to initialize)
oc wait --for=condition=ready pod -l app=postgres -n chess-project --timeout=120s

# Apply the database schema
oc exec -n chess-project statefulset/postgres -- sh -c "psql -U chess -d chess -f /app/init-db.sql" \
  < backend/init-db.sql

# (or copy the file into the pod first)
oc cp backend/init-db.sql chess-project/postgres-0:/tmp/init-db.sql
oc exec -n chess-project pod/postgres-0 -- psql -U chess -d chess -f /tmp/init-db.sql
```

### Update secrets before production

Edit `k8s/01-secret.yml` and replace the placeholder values:

- `jwt-secret` / `jwt-refresh-secret` — generate strong random strings
- `cors-origin` — set to your OpenShift frontend route (e.g. `https://chess-chess-project.apps.cluster.example.com`)

### Access the app

After deploying, the OpenShift Route exposes the frontend:

```bash
oc get route chess -n chess-project -o jsonpath='{.spec.host}'
```

### Image management

Build and push images to your OpenShift registry:

```bash
# Login to OpenShift registry
oc registry login

# Build with oc new-build or docker
docker build -t <registry>/<project>/chess-project-backend:latest ./backend
docker build -t <registry>/<project>/chess-project-chess:latest ./chess-app

docker push <registry>/<project>/chess-project-backend:latest
docker push <registry>/<project>/chess-project-chess:latest

# Then update image references in k8s/03-backend.yml and k8s/04-frontend.yml
# and re-apply:
oc apply -f k8s/03-backend.yml -f k8s/04-frontend.yml -n chess-project
```

### Manifest overview

| File | Resources |
|------|-----------|
| `00-namespace.yml` | Namespace `chess-project` |
| `01-secret.yml` | Secret with DB creds, JWT secrets, CORS origin |
| `02-postgres.yml` | PVC (5Gi, `px-csi-db`), headless Service, StatefulSet |
| `03-backend.yml` | Service + Deployment (2 replicas) |
| `04-frontend.yml` | Service + Deployment (2 replicas) + OpenShift Route (TLS edge termination) |

## Quick Start

```bash
# Start all services
docker compose up --build

# Access the app
open http://localhost:3001
```

## Development

```bash
# Frontend (Vite dev server with HMR)
cd chess-app
npm run dev

# Backend (tsx watch for hot reload)
cd backend
npm run dev

# Database (PostgreSQL via Docker)
docker compose up postgres
```

## API Endpoints

### Authentication
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login, receive JWT tokens
- `POST /api/auth/refresh` — Refresh access token
- `POST /api/auth/logout` — Revoke refresh token

### User Profile
- `GET /api/users/me` — Current user profile (with ELO stats)
- `PATCH /api/users/me` — Update display name and/or avatar
- `GET /api/users/me/elo` — ELO statistics and performance rating
- `GET /api/users/me/history` — Game history (last 100 games)
- `GET /api/users/:id` — Public profile

## WebSocket Protocol

| Direction | Type | Description |
|-----------|------|-------------|
| Client → Server | `auth` | Send JWT token on connect |
| Client → Server | `lobby_join` / `lobby_leave` | Enter/exit waiting lobby |
| Client → Server | `game_create` / `game_join` | Create/join a game |
| Client → Server | `move` | Send chess move (UCI format) |
| Client → Server | `resign` / `draw_offer` / `draw_accept` / `draw_decline` | Game actions |
| Server → Client | `lobby_state` | List of waiting players |
| Server → Client | `game_state` | Board state, clocks, turn |
| Server → Client | `opponent_move` | Other player's move |
| Server → Client | `game_over` | Game finished with result |
| Server → Client | `error` | Error message |

## ELO System

- **Starting Rating**: 1200
- **K-Factor**: 32 (first 30 games), 24 (established), 16 (2000+)
- **Performance Rating**: Calculated per game based on opponent rating and result
- **Auto-Tracking**: ELO updates automatically after each Stockfish game
- **Stats Tracked**: Wins, losses, draws, win rate, average performance rating

## Database Schema

```sql
users              — id, username, email, password_hash, display_name, avatar, elo_rating, elo_games, elo_wins, elo_losses, elo_draws
user_sessions      — id, user_id, token_hash, expires_at
games              — id, white_player_id, black_player_id, status, fen, result, time_control, increment, created_at, finished_at
moves              — id, game_id, move_number, uci_move, san, played_by, created_at
game_history       — id, user_id, game_id, opponent, opponent_elo, player_color, result, player_elo_before/after, elo_change, performance_elo, move_count, game_duration_s
```

## License

MIT

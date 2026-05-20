# Chess — React + TypeScript

A full-featured chess application with Stockfish engine integration, converted from a single HTML file into a proper React + TypeScript application.

## Features

- **Full chess rules**: Castling, en passant, promotion, check/checkmate/stalemate detection
- **Stockfish engine**: Integrated as a Web Worker for AI opponent and move analysis
- **Evaluation bar**: Real-time engine evaluation display
- **Clock**: Configurable time controls (5 min, 10 min)
- **Move history**: Algebraic notation with scrollable history
- **Captured pieces**: Displayed with sorting by value
- **Sound effects**: Web Audio API for move, capture, check, promotion, checkmate
- **PGN support**: Download games as PGN files, load PGN files
- **Lichess-style UI**: Legal move dots/rings, coordinate labels, responsive design

## Tech Stack

- **React 19** + **TypeScript**
- **Vite 8** for bundling and dev server
- **Stockfish.js** for chess engine
- **Docker** + **Nginx** for containerization

## Getting Started

### Development

```bash
cd chess-app
npm install
npm run dev
```

Open http://localhost:5173

### Docker

```bash
docker build -t chess-app .
docker run -p 3000:80 chess-app
```

Or with docker-compose:

```bash
docker-compose up --build
```

Open http://localhost:3000

## Project Structure

```
chess-app/
├── public/
│   └── stockfish.js          # Chess engine (Web Worker)
├── src/
│   ├── engine/               # Pure chess logic
│   │   ├── types.ts          # Types and constants
│   │   ├── logic.ts          # Move generation, attack detection
│   │   ├── notation.ts       # FEN/PGN generation, UCI parsing
│   │   └── index.ts          # Barrel exports
│   ├── hooks/
│   │   └── useChessGame.ts   # Main game state hook
│   ├── components/           # React components
│   │   ├── Board.tsx
│   │   ├── Square.tsx
│   │   ├── EvalBar.tsx
│   │   ├── Clock.tsx
│   │   ├── MoveHistory.tsx
│   │   ├── CapturedPieces.tsx
│   │   ├── Settings.tsx
│   │   ├── StatusBar.tsx
│   │   └── Controls.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── Dockerfile
├── docker-compose.yml
├── vite.config.ts
└── tsconfig.json
```

## Phases

### ✅ Phase 1 — React Conversion + Containerization (Done)
- Converted single HTML file to React + TypeScript
- Split logic into modular engine layer and React components
- Containerized with Docker + Nginx

### Phase 2 — PGN Save/Load
- Full PGN replay from loaded files
- localStorage persistence for last game
- Export game state to PGN

### Phase 3 — Backend (Users + Scores)
- Node.js/Express API server
- SQLite for user auth, game saving, leaderboards
- Docker Compose with backend + DB

### Phase 4 — OpenShift Deployment
- Kubernetes manifests / OpenShift templates
- Route configuration, resource limits

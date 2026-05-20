# Chess Project

A full-featured chess application with Stockfish engine integration.

## Project Structure

- **`index.html`** — Original single-file vanilla JS version (kept for reference)
- **`chess-app/`** — React + TypeScript version (current)

## Current Version: React App (`chess-app/`)

See [chess-app/README.md](chess-app/README.md) for details.

### Quick Start

```bash
cd chess-app
npm install
npm run dev
```

### Docker

```bash
cd chess-app
docker-compose up --build
```

## Phases

### ✅ Phase 1 — React Conversion + Containerization
- Converted single HTML file to React + TypeScript + Vite
- Modular engine layer (pure logic) + React components
- Docker + Nginx containerization

### Phase 2 — PGN Save/Load
- Full PGN replay from loaded files
- localStorage persistence
- Export game state to PGN

### Phase 3 — Backend (Users + Scores)
- Node.js/Express API server
- SQLite for user auth, game saving, leaderboards

### Phase 4 — OpenShift Deployment
- Kubernetes manifests / OpenShift templates
- Route configuration, resource limits

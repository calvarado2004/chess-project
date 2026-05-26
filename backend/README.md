# Chess Backend

Express.js + TypeScript backend for the chess project. Handles authentication, game state, WebSocket connections, and the chess engine.

## Development

```bash
npm run dev      # Start dev server with tsx watch
npm run build    # Compile TypeScript
npm start        # Run compiled server
```

## Testing

```bash
npm run test:unit          # Run all unit tests
npm run test:integration   # Run integration tests
```

Tests use the Node.js built-in test runner (`node:test`) with `tsx` for TypeScript execution.

### Test Files

| File | Coverage | Tests |
|------|----------|-------|
| `tests/elo.test.ts` | ELO rating calculation engine | 26 |
| `tests/notation.test.ts` | FEN generation and UCI move parsing | 15 |
| `tests/logic.test.ts` | Board init, check detection, attack detection, move generation, state cloning | 37 |
| `tests/promotion.test.ts` | Pawn promotion and en passant capture | 12 |
| `tests/types.test.ts` | Piece constants, type helpers, coordinate conversion | 31 |
| `tests/lobby.test.ts` | LobbyManager (join/leave/matching/state) | 21 |
| `tests/validate.test.ts` | Zod validation middleware | 11 |
| `tests/health.test.ts` | Health check route response | 5 |
| `tests/engine-castling.test.ts` | Castling move legality and FEN output | 4 |
| **Total** | | **162** |

### Test Infrastructure

- **Runner**: Node.js built-in test runner (`node:test`)
- **TypeScript**: `tsx` for direct TS execution
- **Assertions**: `node:assert/strict`
- **No external test framework** - zero additional dependencies

### Adding New Tests

Create a new file in `tests/` with the `.test.ts` suffix:

```typescript
import assert from 'node:assert/strict';
import test from 'node:test';
import { someFunction } from '../src/someModule.js';

test('describes what the test verifies', () => {
  const result = someFunction(input);
  assert.equal(result, expected);
});
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JSON Web Token signing secret
- `CORS_ORIGIN` - Allowed CORS origins (comma-separated)
- `REDIS_URL` - Redis connection string

## Architecture

```
src/
├── server.ts          # Express app entry point
├── engine/            # Chess engine (logic, notation, ELO, types)
├── routes/            # HTTP routes (auth, health, users)
├── middleware/        # Express middleware (auth, validation)
├── services/          # Business logic services
├── ws/                # WebSocket game server (lobby, rooms)
└── db/                # Database connection and migration
```

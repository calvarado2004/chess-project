import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.js';

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use('/health', healthRoutes);

// Unknown route handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`Chess backend listening on http://localhost:${PORT}`);
});

export { app, server };

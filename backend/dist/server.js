import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import { WsGameServer } from './ws/server.js';
const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const allowedOrigins = CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
function isAllowedOrigin(origin, callback) {
    if (!origin) {
        callback(null, true);
        return;
    }
    if (allowedOrigins.includes(origin) ||
        origin.startsWith('capacitor://') ||
        origin.startsWith('ionic://') ||
        origin === 'http://localhost' ||
        origin === 'https://localhost') {
        callback(null, true);
        return;
    }
    callback(new Error(`Origin ${origin} is not allowed by CORS`));
}
// Middleware
app.use(cors({
    origin: isAllowedOrigin,
    credentials: true,
}));
app.use(express.json());
// Routes
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// Unknown route handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});
// Error handler
app.use((err, _req, res, _next) => {
    console.error('[ERR]', err.message);
    res.status(500).json({ error: 'Internal server error' });
});
const server = http.createServer(app);
// Attach WebSocket server
const wsServer = new WsGameServer(server);
wsServer.startHeartbeat(30_000);
server.listen(PORT, () => {
    console.log(`Chess backend listening on http://localhost:${PORT}`);
});
export { app, server };
//# sourceMappingURL=server.js.map
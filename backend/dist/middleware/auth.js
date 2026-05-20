import jwt from 'jsonwebtoken';
export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    const token = authHeader.slice(7);
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            res.status(500).json({ error: 'Server configuration error' });
            return;
        }
        const decoded = jwt.verify(token, secret);
        req.userId = decoded.userId;
        req.username = decoded.username;
        next();
    }
    catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
export function optionalAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const secret = process.env.JWT_SECRET;
        if (secret) {
            try {
                const decoded = jwt.verify(token, secret);
                req.userId = decoded.userId;
                req.username = decoded.username;
            }
            catch {
                // Token invalid, continue without auth
            }
        }
    }
    next();
}
//# sourceMappingURL=auth.js.map
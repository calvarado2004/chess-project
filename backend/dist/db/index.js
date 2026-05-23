import { Pool } from 'pg';
const useSSL = process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false';
const config = {
    connectionString: process.env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
};
const pool = new Pool(config);
pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err.message);
});
export async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log(`[DB] ${duration}ms — ${text.slice(0, 120)}`);
        return result;
    }
    catch (error) {
        console.error('[DB] Query error:', text.slice(0, 120), error);
        throw error;
    }
}
export async function end() {
    await pool.end();
}
export default pool;
//# sourceMappingURL=index.js.map
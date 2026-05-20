import { Pool } from 'pg';
declare const pool: Pool;
export declare function query(text: string, params?: unknown[]): Promise<import("pg").QueryResult<any>>;
export declare function end(): Promise<void>;
export default pool;
//# sourceMappingURL=index.d.ts.map
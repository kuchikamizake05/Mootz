import pg from 'pg';

export interface Database {
  probe(): Promise<void>;
  close(): Promise<void>;
}

export function createDatabase(connectionString: string): Database & { pool: pg.Pool } {
  const pool = new pg.Pool({
    connectionString, max: 10, connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 30_000, query_timeout: 3000, statement_timeout: 3000,
  });
  // An idle socket failure must not terminate the API process.
  pool.on('error', () => { process.stderr.write('Database idle connection unavailable\n'); });
  return {
    pool,
    async probe() { await pool.query('SELECT PostGIS_Version()'); },
    async close() { await pool.end(); },
  };
}

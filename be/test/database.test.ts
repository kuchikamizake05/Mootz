import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), end: vi.fn(), on: vi.fn(), options: {} as Record<string, unknown> }));
vi.mock('pg', () => ({ default: { Pool: class {
  constructor(options: Record<string, unknown>) { mocks.options = options; }
  query = mocks.query;
  end = mocks.end;
  on = mocks.on;
} } }));
import { createDatabase } from '../src/database.ts';
beforeEach(() => { vi.clearAllMocks(); });
describe('database lifecycle adapter', () => {
  it('checks PostGIS and closes its bounded pool', async () => {
    const database = createDatabase('postgresql://localhost/test');
    await database.probe();
    expect(mocks.query).toHaveBeenCalledWith('SELECT PostGIS_Version()');
    expect(mocks.options).toMatchObject({ max: 10, connectionTimeoutMillis: 2000, query_timeout: 3000 });
    await database.close();
    expect(mocks.end).toHaveBeenCalledOnce();
  });
  it('propagates probe failure for readiness and contains idle socket errors', async () => {
    const database = createDatabase('postgresql://localhost/test');
    mocks.query.mockRejectedValueOnce(new Error('offline'));
    await expect(database.probe()).rejects.toThrow('offline');
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      expect(mocks.on.mock.calls[0]?.[0]).toBe('error');
      const callback = mocks.on.mock.calls[0]?.[1] as () => void;
      callback();
      expect(write).toHaveBeenCalledWith('Database idle connection unavailable\n');
    } finally { write.mockRestore(); }
  });
});

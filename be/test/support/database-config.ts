export function assertTestDatabase(value: string | undefined): void {
 try {
  const url = new URL(value ?? '');
  if (!['postgres:','postgresql:'].includes(url.protocol) || !url.hostname || !/^\/[a-zA-Z0-9_]+_tests$/.test(url.pathname)) throw Error();
 } catch { throw new Error('TEST_DATABASE_URL must explicitly select a disposable database ending in _tests'); }
}

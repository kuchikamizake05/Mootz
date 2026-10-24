import { expect, it } from 'vitest';
import { assertTestDatabase } from './support/database-config.ts';

it('requires an explicitly named disposable test database without exposing credentials', () => {
 expect(() => assertTestDatabase('postgresql://synthetic:private@localhost:55432/mootz_frames_tests')).not.toThrow();
 for (const input of [undefined,'postgresql://synthetic:private@localhost:55432/mootz','https://localhost/mootz_frames_tests','not-a-url']) {
  expect(() => assertTestDatabase(input)).toThrow();
  try { assertTestDatabase(input); } catch(error) { expect(String(error)).not.toContain('synthetic:private'); }
 }
});

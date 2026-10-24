import { assertTestDatabase } from './database-config.ts';
assertTestDatabase(process.env.TEST_DATABASE_URL);

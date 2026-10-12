import { defineConfig } from 'vitest/config';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const envFile = fileURLToPath(new URL('./.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is not set. Copy server/.env.example to server/.env first.');
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/globalSetup.ts'],
    // All test files share one database, so run them one at a time.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: process.env.JWT_SECRET ?? 'test-secret-at-least-16-chars',
      CLIENT_URL: process.env.CLIENT_URL ?? 'http://localhost:5173',
    },
  },
});

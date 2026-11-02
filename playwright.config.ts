import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from '@playwright/test';

const PORT = 4799;
export const AUTH_STATE = 'test-results/.auth/state.json';

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  use: { baseURL: `http://127.0.0.1:${PORT}`, channel: 'chrome', locale: 'en-US' },
  projects: [
    { name: 'sign-in', testMatch: /auth\.setup\.ts/ },
    { name: 'app', dependencies: ['sign-in'], use: { storageState: AUTH_STATE } },
  ],
  webServer: {
    command: `pnpm --filter @mycraft/web build && pnpm --filter @mycraft/server exec tsx src/main.ts --demo --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/api/health`,
    env: {
      MYCRAFT_TOKEN: 'e2e-token',
      MYCRAFT_DATA_DIR: join(tmpdir(), `mycraft-e2e-${process.pid}`),
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

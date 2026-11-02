import { defineConfig, devices } from '@playwright/test';
export default defineConfig({ testDir: './e2e-combined', timeout: 60000, use: { baseURL: process.env.BASE_URL ?? 'http://localhost:4173', ...devices['Desktop Chrome'] } });

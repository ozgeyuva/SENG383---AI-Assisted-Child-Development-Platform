import { defineConfig} from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    testMatch: '**/*.e2e.js',
    use: {
        baseURL: 'http://127.0.0.1:5174',
    },
    webServer: [
        {
            command: 'node ../backend/e2e-server.js',
            port: 3100,
            reuseExistingServer: false,
        },
        {
            command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
            url: 'http://127.0.0.1:5174',
            env: {
                E2E_API_URL: 'http://127.0.0.1:3100'
            },
            reuseExistingServer: false,
        },
    ],
})
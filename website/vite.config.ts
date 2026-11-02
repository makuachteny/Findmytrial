import react from '@vitejs/plugin-react';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const APP_DIR = fileURLToPath(new URL('../app', import.meta.url));

/** Sign in opens the app through the /app proxy, so `npm run dev` here starts it too. */
function appDevServer(): Plugin {
  return {
    name: 'app-dev-server',
    apply: 'serve',
    configureServer(server) {
      const app = spawn(process.execPath, ['node_modules/vite/bin/vite.js'], {
        cwd: APP_DIR,
        stdio: 'inherit',
      });
      const stop = () => app.kill();
      server.httpServer?.once('close', stop);
      process.once('exit', stop);
    },
  };
}

export default defineConfig({
  plugins: [react(), appDevServer()],
  server: {
    proxy: { '/app': { target: 'http://localhost:5174', ws: true } },
  },
});

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/engine/**/*.ts', 'src/lib/**/*.ts'],
      exclude: ['src/engine/index.ts', 'src/lib/ws.ts', 'src/lib/api.ts'],
    },
  },
});

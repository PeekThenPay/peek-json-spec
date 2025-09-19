import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      exclude: [
        'src/types/**',
        'src/index.ts',
        'scripts/**',
        'node_modules/**',
        'dist/**',
        '**/*.{test,spec}.{js,ts}',
        '**/*.d.ts',
        'eslint.config.{js,cjs,ts}',
        'vitest.config.{js,cjs,ts}',
      ],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});

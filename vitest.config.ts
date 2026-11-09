import { defineConfig } from 'vitest/config';

// Tests run in a fixed time zone so day/week boundaries are reproducible.
// The history property test runs a second time in a zone with daylight saving.
export default defineConfig({
  test: {
    pool: 'forks',
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'seoul',
          include: ['tests/**/*.test.ts'],
          env: { TZ: 'Asia/Seoul' },
        },
      },
      {
        extends: true,
        test: {
          name: 'new-york',
          include: ['tests/property/history.prop.test.ts', 'tests/property/outcomes.prop.test.ts'],
          env: { TZ: 'America/New_York' },
        },
      },
    ],
  },
});

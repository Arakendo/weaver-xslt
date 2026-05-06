import { fileURLToPath } from 'node:url';

import { weaverVitePlugin } from '../src/vite.js';

const fixtureRoot = fileURLToPath(new URL('./', import.meta.url));
const workspaceRoot = fileURLToPath(new URL('../', import.meta.url));

export default {
  root: fixtureRoot,
  plugins: [
    weaverVitePlugin({
      runtimeModuleSpecifier: '../src/runtime/index.ts',
    }),
  ],
  server: {
    fs: {
      allow: [workspaceRoot],
    },
  },
};
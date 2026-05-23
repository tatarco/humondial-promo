import '@testing-library/jest-dom';

import { afterEach } from 'vitest';

import { resetListMatchesWarmForTests } from '../lib/warmListMatches.js';

const mem = new Map();
globalThis.localStorage = {
  getItem: (key) => (mem.has(String(key)) ? mem.get(String(key)) : null),
  setItem: (key, val) => {
    mem.set(String(key), String(val));
  },
  removeItem: (key) => {
    mem.delete(String(key));
  },
  clear: () => {
    mem.clear();
  },
  key: (i) => [...mem.keys()][i] ?? null,
  get length() {
    return mem.size;
  },
};

afterEach(() => {
  resetListMatchesWarmForTests();
});


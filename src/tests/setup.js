import '@testing-library/jest-dom';

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

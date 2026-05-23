import { callFn } from './api.js';

let inflight = null;

export function startListMatchesWarm() {
  if (inflight) return inflight;
  inflight = callFn('listMatches', {});
  return inflight;
}

export function takeListMatchesWarm() {
  const p = inflight;
  inflight = null;
  return p;
}

export function resetListMatchesWarmForTests() {
  inflight = null;
}

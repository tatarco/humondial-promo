import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getToken, setToken, clearToken, isLoggedIn } from '../lib/session.js';

const STORAGE_KEY = 'promo_session_token';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('session', () => {
  it('returns null when no token stored', () => {
    expect(getToken()).toBeNull();
  });

  it('setToken stores token in localStorage', () => {
    setToken('abc-123');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('abc-123');
  });

  it('getToken returns stored token', () => {
    localStorage.setItem(STORAGE_KEY, 'tok-xyz');
    expect(getToken()).toBe('tok-xyz');
  });

  it('clearToken removes token', () => {
    setToken('tok-xyz');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('isLoggedIn returns false with no token', () => {
    expect(isLoggedIn()).toBe(false);
  });

  it('isLoggedIn returns true when token present', () => {
    setToken('tok-xyz');
    expect(isLoggedIn()).toBe(true);
  });
});

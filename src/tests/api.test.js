import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as api from '../lib/api.js';

describe('isLikelyUpstreamHtmlFault', () => {
  it('detects Cloudflare 522 HTML for Supabase', () => {
    const html =
      '<!DOCTYPE html>\n<title>supabase.co | 522: Connection timed out</title>\n<body><div id="cf-error-details">';
    expect(api.isLikelyUpstreamHtmlFault(522, html, 'text/html; charset=UTF-8')).toBe(true);
  });

  it('does not flag normal JSON', () => {
    expect(api.isLikelyUpstreamHtmlFault(401, '{"message":"x"}', 'application/json')).toBe(false);
  });

  it('detects structured HTML cf panels on CF edge statuses', () => {
    expect(
      api.isLikelyUpstreamHtmlFault(524, '<html lang="en"><body><div class="cf-error-overview">', 'text/html'),
    ).toBe(true);
  });
});

describe('callFn upstream handling', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_BASE44_URL', 'https://fn.tests.local');
    vi.stubEnv('VITE_BASE44_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('rejects UPSTREAM_UNAVAILABLE when upstream returns gateway HTML', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 522,
          statusText: '',
          headers: new Headers({ 'content-type': 'text/html;charset=utf-8' }),
          text: () =>
            Promise.resolve(
              '<!DOCTYPE html><html><title>522: Connection timed out</title><div id="cf-error-details"></div></html>',
            ),
        }),
      ),
    );

    const { callFn } = await import('../lib/api.js');

    await expect(callFn('getLeaderboard', {})).rejects.toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
      message: expect.stringContaining('השרת הבסיס'),
    });
  });

  it('parses OK JSON payloads from functions', async () => {
    const payload = { data: { ok: true, total_points: 1 } };

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: '',
          headers: new Headers({ 'content-type': 'application/json; charset=UTF-8' }),
          text: () => Promise.resolve(JSON.stringify(payload)),
        }),
      ),
    );

    const { callFn } = await import('../lib/api.js');

    await expect(callFn('getLeaderboard', { token: 't' })).resolves.toEqual(payload);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      'https://fn.tests.local/api/functions/getLeaderboard',
      expect.any(Object),
    );
  });
});

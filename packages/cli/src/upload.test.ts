import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CheckResult } from '@prodverdict/engine';
import { readUploadEnv, uploadCheckResult } from './upload.js';

const sample: CheckResult = {
  contract: 'access',
  verdict: 'pass',
  findings: [],
  evaluatedAt: '2026-05-30T12:00:00.000Z',
};

describe('uploadCheckResult', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PRODVERDICT_API_URL;
    delete process.env.PRODVERDICT_API_KEY;
    delete process.env.PRODVERDICT_PROJECT_ID;
  });

  it('POSTs CheckResult JSON to /api/runs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);

    await uploadCheckResult(sample, {
      apiUrl: 'https://prodverdict.com',
      apiKey: 'pv_test_key',
      projectId: 'proj-1',
      source: 'cli',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://prodverdict.com/api/runs');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer pv_test_key',
      'X-ProdVerdict-Project-Id': 'proj-1',
    });
    const body = JSON.parse(String(init.body));
    expect(body.contract).toBe('access');
    expect(body.verdict).toBe('pass');
    expect(body.source).toBe('cli');
  });

  it('throws when response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'nope' }));

    await expect(
      uploadCheckResult(sample, {
        apiUrl: 'https://prodverdict.com/',
        apiKey: 'pv_x',
        projectId: 'p',
        source: 'cli',
      }),
    ).rejects.toThrow(/Upload failed \(401\)/);
  });
});

describe('readUploadEnv', () => {
  afterEach(() => {
    delete process.env.PRODVERDICT_API_URL;
    delete process.env.PRODVERDICT_API_KEY;
    delete process.env.PRODVERDICT_PROJECT_ID;
  });

  it('returns null when any env var is missing', () => {
    process.env.PRODVERDICT_API_URL = 'https://prodverdict.com';
    expect(readUploadEnv()).toBeNull();
  });

  it('returns env when all vars are set', () => {
    process.env.PRODVERDICT_API_URL = 'https://prodverdict.com';
    process.env.PRODVERDICT_API_KEY = 'pv_k';
    process.env.PRODVERDICT_PROJECT_ID = 'uuid';
    expect(readUploadEnv()).toEqual({
      apiUrl: 'https://prodverdict.com',
      apiKey: 'pv_k',
      projectId: 'uuid',
    });
  });
});

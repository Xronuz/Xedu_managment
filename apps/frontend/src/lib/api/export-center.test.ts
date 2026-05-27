import { describe, it, expect, afterEach, vi } from 'vitest';

// Mock the apiClient dependency so the module loads without path-alias resolution issues
vi.mock('./client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

import { exportCenterApi } from './export-center';

describe('exportCenterApi.downloadExport', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalEnv;
    }
  });

  it('produces correct URL when env includes /api/v1 (production convention)', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://xedu.uz/api/v1';
    const url = exportCenterApi.downloadExport('job-123');
    expect(url).toBe('https://xedu.uz/api/v1/exports/job-123/download');
    expect(url).not.toContain('/v1/v1/');
  });

  it('produces correct URL when env includes /api/v1 (localhost convention)', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001/api/v1';
    const url = exportCenterApi.downloadExport('job-456');
    expect(url).toBe('http://localhost:3001/api/v1/exports/job-456/download');
    expect(url).not.toContain('/v1/v1/');
  });

  it('never contains double /v1 segment (regression guard)', () => {
    const testUrls = [
      'https://xedu.uz/api/v1',
      'http://localhost:3001/api/v1',
      'https://api.example.com/api/v1',
    ];
    for (const base of testUrls) {
      process.env.NEXT_PUBLIC_API_URL = base;
      const url = exportCenterApi.downloadExport('test-id');
      expect(url).not.toMatch(/\/v1\/v1\//);
      expect(url).toMatch(new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/exports/test-id/download$`));
    }
  });
});

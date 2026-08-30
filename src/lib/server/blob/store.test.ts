import { beforeEach, describe, expect, test, vi } from 'vitest';

// client.test.ts와 같은 이유 — Vite가 .env를 $env/dynamic/private에 자동 주입하므로
// "토큰이 없을 때" 계약을 재현하려면 이 모듈을 테스트가 직접 통제해야 한다.
const { mockEnv } = vi.hoisted(() => ({
	mockEnv: {} as Record<string, string | undefined>
}));
vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));

describe('getBlobStore', () => {
	beforeEach(() => {
		vi.resetModules();
		for (const key of Object.keys(mockEnv)) delete mockEnv[key];
	});

	test('BLOB_READ_WRITE_TOKEN이 설정되지 않으면 에러를 던진다', async () => {
		const { getBlobStore } = await import('./store');
		expect(() => getBlobStore()).toThrow('BLOB_READ_WRITE_TOKEN');
	});

	test('토큰이 있으면 BlobStore를 만들고 같은 인스턴스를 재사용한다', async () => {
		// createVercelBlobStore는 put 래퍼 객체만 만들고 네트워크를 타지 않는다.
		// 실제 Vercel Blob 업로드 왕복은 여전히 미검증 gap이다.
		mockEnv.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_dummy_for_test';
		const { getBlobStore } = await import('./store');
		const first = getBlobStore();
		expect(typeof first.put).toBe('function');
		expect(getBlobStore()).toBe(first);
	});
});

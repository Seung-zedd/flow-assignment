import { describe, expect, test } from 'vitest';
import { getBlobStore } from './store';

describe('getBlobStore', () => {
	// client.test.ts의 getDb() 패턴과 동일 — 이 프로세스에는 BLOB_READ_WRITE_TOKEN이
	// 설정되어 있지 않다. 실제 Vercel Blob 경로(put 호출)는 이 환경에서 검증할 수 없는
	// 명시적 gap이다(client.ts의 Neon 실경로와 같은 성격).
	test('BLOB_READ_WRITE_TOKEN이 설정되지 않으면 에러를 던진다', () => {
		expect(() => getBlobStore()).toThrow('BLOB_READ_WRITE_TOKEN');
	});
});

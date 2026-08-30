import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createRowsAdapter } from './client';

// Vite는 프로젝트 루트의 .env를 자동으로 읽어 $env/dynamic/private 에 주입한다. 그래서
// 로컬에 실제 .env가 있으면 "환경변수가 없을 때" 계약이 테스트에서 재현되지 않는다.
// 모듈 자체를 모킹해 테스트가 보는 env를 이 파일이 직접 통제한다 — .env 유무와 무관하게
// 같은 결과가 나오고, 실제 Neon 엔드포인트로 나갈 여지도 사라진다.
const { mockEnv } = vi.hoisted(() => ({
	mockEnv: {} as Record<string, string | undefined>
}));
vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));

describe('createRowsAdapter', () => {
	test('{ rows } 형태를 배열로 어댑팅한다', async () => {
		const adapter = createRowsAdapter({
			query: async <T>() => ({ rows: [{ extension: 'exe' }] as T[] })
		});
		const rows = await adapter.query('SELECT 1');
		expect(rows).toEqual([{ extension: 'exe' }]);
	});
});

describe('getDb', () => {
	beforeEach(() => {
		// getDb()는 모듈 수준 cached에 인스턴스를 남긴다. 테스트마다 모듈을 새로 적재해
		// 앞 테스트의 캐시가 다음 테스트의 판정을 가리지 않게 한다.
		vi.resetModules();
		for (const key of Object.keys(mockEnv)) delete mockEnv[key];
	});

	test('DATABASE_URL이 설정되지 않으면 에러를 던진다', async () => {
		const { getDb } = await import('./client');
		expect(() => getDb()).toThrow('DATABASE_URL');
	});

	test('DATABASE_URL이 있으면 Db를 만들고 같은 인스턴스를 재사용한다', async () => {
		// 연결 문자열 형식만 갖춘 더미 값 — neon()은 생성 시점에 네트워크를 타지 않으므로
		// 이 테스트도 외부로 나가지 않는다. 실제 질의 왕복은 여전히 미검증 gap이다.
		mockEnv.DATABASE_URL = 'postgresql://user:pw@db.example.invalid/neondb?sslmode=require';
		const { getDb } = await import('./client');
		const first = getDb();
		expect(typeof first.query).toBe('function');
		expect(getDb()).toBe(first);
	});
});

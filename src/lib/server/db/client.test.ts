import { describe, expect, test } from 'vitest';
import { createRowsAdapter } from './client';
import { getDb } from './client';

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
	// 이 프로세스에는 DATABASE_URL이 설정되어 있지 않다(PGlite로 테스트하기 때문) —
	// Neon 실경로(sql.query 호출)는 이 테스트 환경에서 검증할 수 없는 명시적 gap이다.
	test('DATABASE_URL이 설정되지 않으면 에러를 던진다', () => {
		expect(() => getDb()).toThrow('DATABASE_URL');
	});
});

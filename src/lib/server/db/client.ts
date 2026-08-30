import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';

// policy-repo.ts가 의존하는 최소 인터페이스. Neon HTTP 드라이버와 PGlite(테스트)는
// 반환 모양이 다르므로(배열 vs { rows }) 각각을 이 인터페이스로 맞춰 어댑팅한다.
export interface Db {
	query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

// PGlite 등 { rows } 형태를 반환하는 드라이버를 Db로 어댑팅한다. 테스트 헬퍼로 노출한다.
export interface RowsQueryable {
	query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export function createRowsAdapter(client: RowsQueryable): Db {
	return {
		async query<T>(text: string, params: unknown[] = []): Promise<T[]> {
			const result = await client.query<T>(text, params);
			return result.rows;
		}
	};
}

let cached: Db | undefined;

// Neon 실경로 생성 — 이 함수 안에서만 네트워크 드라이버를 만든다. DATABASE_URL이 없는
// 환경(PGlite 테스트 등)에서는 이 함수를 호출하지 않으므로 검증 대상에서 제외된다.
export function getDb(): Db {
	if (!cached) {
		const databaseUrl = env.DATABASE_URL;
		if (!databaseUrl) {
			throw new Error('DATABASE_URL이 설정되지 않았습니다.');
		}
		const sql = neon(databaseUrl);
		cached = {
			query: <T>(text: string, params: unknown[] = []) =>
				sql.query(text, params) as unknown as Promise<T[]>
		};
	}
	return cached;
}

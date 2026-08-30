import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';

// @MX:NOTE: [AUTO] 드라이버 두 종을 하나의 인터페이스로 모으는 지점 — Neon HTTP는 행 배열을
// 그대로 돌려주고 PGlite(테스트)는 { rows }로 감싸 돌려준다. policy-repo는 이 차이를 모른 채
// Db.query 하나만 호출하므로, 어댑팅은 반드시 이 파일 안에서 끝나야 한다.
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
			// neon()의 기본 옵션(arrayMode:false, fullResults:false)에서 query()의 반환 타입은
			// QueryRows<false> = Record<string, any>[] 이다. 즉 Db가 요구하는 "행 배열"과 이미
			// 같은 모양이라 감싸지 않고, 행 원소 타입만 호출부가 지정한 T로 좁힌다
			// (as unknown 경유 없이 한 번의 단언으로 충분하다).
			query: <T>(text: string, params: unknown[] = []) => sql.query(text, params) as Promise<T[]>
		};
	}
	return cached;
}

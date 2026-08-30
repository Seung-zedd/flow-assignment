import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '../../../../scripts/migrate';
import { createRowsAdapter, type Db } from '$lib/server/db/client';
import { GET } from './+server';
import { PATCH } from './fixed/[ext]/+server';
import { POST } from './custom/+server';
import { DELETE } from './custom/[ext]/+server';

let pglite: PGlite;
let db: Db;

beforeEach(async () => {
	pglite = new PGlite();
	await applyMigrations(async (migration) => {
		await pglite.exec(migration.sql);
	});
	db = createRowsAdapter(pglite);
});

afterEach(async () => {
	await pglite.close();
});

function locals() {
	return { db };
}

function jsonRequest(url: string, method: string, body?: unknown) {
	return new Request(url, {
		method,
		headers: { 'content-type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
}

interface JsonResponse {
	ok: boolean;
	[key: string]: unknown;
}

async function readJson(response: Response): Promise<JsonResponse> {
	return (await response.json()) as JsonResponse;
}

describe('GET /api/policy', () => {
	test('고정 7개·커스텀 0개·customCount 0을 반환한다', async () => {
		const response = await GET({ locals: locals() } as never);
		const body = await readJson(response);
		expect(body.fixed).toHaveLength(7);
		expect(body.custom).toEqual([]);
		expect(body.customCount).toBe(0);
	});
});

describe('PATCH /api/policy/fixed/[ext]', () => {
	test('AC-UPLOAD-001: exe를 체크하면 정식 상태에 반영된다', async () => {
		const response = await PATCH({
			params: { ext: 'exe' },
			request: jsonRequest('http://localhost/api/policy/fixed/exe', 'PATCH', { blocked: true }),
			locals: locals()
		} as never);
		const body = await readJson(response);
		expect(body.ok).toBe(true);
		const fixed = body.fixed as { extension: string; blocked: boolean }[];
		expect(fixed.find((row) => row.extension === 'exe')?.blocked).toBe(true);
	});

	test('존재하지 않는 고정 확장자는 404를 반환한다', async () => {
		await expect(
			PATCH({
				params: { ext: 'zzz' },
				request: jsonRequest('http://localhost/api/policy/fixed/zzz', 'PATCH', { blocked: true }),
				locals: locals()
			} as never)
		).rejects.toMatchObject({ status: 404 });
	});

	test('blocked 필드가 boolean이 아니면 400을 반환한다', async () => {
		await expect(
			PATCH({
				params: { ext: 'exe' },
				request: jsonRequest('http://localhost/api/policy/fixed/exe', 'PATCH', {
					blocked: 'yes'
				}),
				locals: locals()
			} as never)
		).rejects.toMatchObject({ status: 400 });
	});
});

describe('POST /api/policy/custom', () => {
	function post(extension: unknown) {
		return POST({
			request: jsonRequest('http://localhost/api/policy/custom', 'POST', { extension }),
			locals: locals()
		} as never);
	}

	test('AC-UPLOAD-002: SH를 추가하면 소문자 sh로 저장되고 카운터가 1이다', async () => {
		const response = await post('SH');
		const body = await readJson(response);
		expect(response.status).toBe(200);
		expect(body.ok).toBe(true);
		expect(body.extension).toBe('sh');
		expect(body.custom).toEqual([{ extension: 'sh' }]);
		expect(body.customCount).toBe(1);
	});

	test('AC-UPLOAD-003: 이미 있는 sh를 다시 추가하면 409 EXT_DUPLICATE', async () => {
		await post('sh');
		const response = await post('sh');
		const body = await readJson(response);
		expect(response.status).toBe(409);
		expect((body.error as { code: string }).code).toBe('EXT_DUPLICATE');
	});

	test('AC-UPLOAD-004: 고정 exe를 추가하면 409 EXT_IS_FIXED', async () => {
		const response = await post('exe');
		const body = await readJson(response);
		expect(response.status).toBe(409);
		expect((body.error as { code: string }).code).toBe('EXT_IS_FIXED');
	});

	test('AC-UPLOAD-005a: 21자는 400 EXT_TOO_LONG', async () => {
		const response = await post('a'.repeat(21));
		const body = await readJson(response);
		expect(response.status).toBe(400);
		expect((body.error as { code: string }).code).toBe('EXT_TOO_LONG');
	});

	test.each(['ex e', 'ех', 'a.b'])('AC-UPLOAD-005b: %s 는 400 EXT_INVALID_CHARS', async (value) => {
		const response = await post(value);
		const body = await readJson(response);
		expect(response.status).toBe(400);
		expect((body.error as { code: string }).code).toBe('EXT_INVALID_CHARS');
	});

	test('AC-UPLOAD-005b: 전각 ｅｘｅ는 NFKC 정규화 후 409 EXT_IS_FIXED', async () => {
		const response = await post('ｅｘｅ');
		const body = await readJson(response);
		expect(response.status).toBe(409);
		expect((body.error as { code: string }).code).toBe('EXT_IS_FIXED');
	});

	test.each(['', '   ', '.'])('AC-UPLOAD-005b: %j 는 400 EXT_EMPTY', async (value) => {
		const response = await post(value);
		const body = await readJson(response);
		expect(response.status).toBe(400);
		expect((body.error as { code: string }).code).toBe('EXT_EMPTY');
	});

	test('AC-UPLOAD-006: 200개 초과 시 409 EXT_LIMIT_REACHED이고 카운트는 200 그대로다', async () => {
		await db.query(
			`INSERT INTO blocked_extension (extension, kind, is_blocked)
			 SELECT 'c' || i, 'custom', true FROM generate_series(1, 200) AS i`
		);
		const response = await post('newone');
		const body = await readJson(response);
		expect(response.status).toBe(409);
		expect((body.error as { code: string }).code).toBe('EXT_LIMIT_REACHED');
		const countRows = await db.query<{ count: string }>(
			"SELECT count(*) FROM blocked_extension WHERE kind = 'custom'"
		);
		expect(Number(countRows[0].count)).toBe(200);
	});

	test('엣지: 커스텀 jpeg 추가 시 jpg로 저장되고 ALIAS_FOLDED 알림이 실린다', async () => {
		const response = await post('jpeg');
		const body = await readJson(response);
		expect(body.extension).toBe('jpg');
		expect((body.notice as { code: string }).code).toBe('ALIAS_FOLDED');
	});

	test('필드 누락 시 400 EXT_EMPTY', async () => {
		const response = await POST({
			request: jsonRequest('http://localhost/api/policy/custom', 'POST', {}),
			locals: locals()
		} as never);
		const body = await readJson(response);
		expect(response.status).toBe(400);
		expect((body.error as { code: string }).code).toBe('EXT_EMPTY');
	});
});

describe('DELETE /api/policy/custom/[ext]', () => {
	test('AC-UPLOAD-007: sh를 삭제하면 목록에서 사라지고 카운터가 감소한다', async () => {
		await POST({
			request: jsonRequest('http://localhost/api/policy/custom', 'POST', { extension: 'sh' }),
			locals: locals()
		} as never);
		const response = await DELETE({ params: { ext: 'sh' }, locals: locals() } as never);
		const body = await readJson(response);
		expect(body.ok).toBe(true);
		expect(body.custom).toEqual([]);
		expect(body.customCount).toBe(0);
	});

	test('존재하지 않는 확장자를 삭제해도 200 성공(멱등)이다', async () => {
		const response = await DELETE({ params: { ext: 'zzz' }, locals: locals() } as never);
		const body = await readJson(response);
		expect(response.status).toBe(200);
		expect(body.ok).toBe(true);
	});
});

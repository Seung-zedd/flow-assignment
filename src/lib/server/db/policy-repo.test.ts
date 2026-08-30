import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '../../../../scripts/migrate';
import { createRowsAdapter, type Db } from './client';
import { addCustom, deleteCustom, getPolicy, setFixedBlocked } from './policy-repo';

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

describe('getPolicy', () => {
	test('고정 7개는 sort_order 오름차순, 커스텀은 빈 배열, customCount는 0이다', async () => {
		const policy = await getPolicy(db);
		expect(policy.fixed.map((row) => row.extension)).toEqual([
			'bat',
			'cmd',
			'com',
			'cpl',
			'exe',
			'scr',
			'js'
		]);
		expect(policy.fixed.every((row) => row.blocked === false)).toBe(true);
		expect(policy.custom).toEqual([]);
		expect(policy.customCount).toBe(0);
	});

	test('커스텀 항목은 알파벳 오름차순으로 반환된다', async () => {
		await addCustom(db, 'zz');
		await addCustom(db, 'aa');
		const policy = await getPolicy(db);
		expect(policy.custom).toEqual([{ extension: 'aa' }, { extension: 'zz' }]);
		expect(policy.customCount).toBe(2);
	});
});

describe('setFixedBlocked', () => {
	test('AC-UPLOAD-001: exe를 체크하면 is_blocked가 true로 영속 저장된다', async () => {
		await setFixedBlocked(db, 'exe', true);
		const policy = await getPolicy(db);
		expect(policy.fixed.find((row) => row.extension === 'exe')?.blocked).toBe(true);
	});

	test('AC-UPLOAD-001: 다시 uncheck하면 is_blocked가 false로 돌아온다', async () => {
		await setFixedBlocked(db, 'exe', true);
		await setFixedBlocked(db, 'exe', false);
		const policy = await getPolicy(db);
		expect(policy.fixed.find((row) => row.extension === 'exe')?.blocked).toBe(false);
	});

	test('같은 값으로 두 번 호출해도 결과가 같다(멱등)', async () => {
		await setFixedBlocked(db, 'js', true);
		await setFixedBlocked(db, 'js', true);
		const policy = await getPolicy(db);
		expect(policy.fixed.find((row) => row.extension === 'js')?.blocked).toBe(true);
	});
});

describe('addCustom', () => {
	test('AC-UPLOAD-002: sh를 추가하면 kind=custom, is_blocked=true인 행이 1개 생긴다', async () => {
		const result = await addCustom(db, 'sh');
		expect(result).toEqual({ ok: true, extension: 'sh' });
		const rows = await db.query<{ kind: string; is_blocked: boolean }>(
			"SELECT kind, is_blocked FROM blocked_extension WHERE extension = 'sh'"
		);
		expect(rows).toEqual([{ kind: 'custom', is_blocked: true }]);
	});

	test('AC-UPLOAD-003: 이미 있는 sh를 다시 추가하면 EXT_DUPLICATE이고 행 수가 변하지 않는다', async () => {
		await addCustom(db, 'sh');
		const before = await db.query('SELECT 1 FROM blocked_extension');
		const result = await addCustom(db, 'sh');
		const after = await db.query('SELECT 1 FROM blocked_extension');
		expect(result).toEqual({ ok: false, code: 'EXT_DUPLICATE' });
		expect(after.length).toBe(before.length);
	});

	test('AC-UPLOAD-004: 고정 exe를 추가하면 EXT_IS_FIXED이고 커스텀 목록에 추가되지 않는다', async () => {
		const result = await addCustom(db, 'exe');
		expect(result).toEqual({ ok: false, code: 'EXT_IS_FIXED' });
		const policy = await getPolicy(db);
		expect(policy.custom).toEqual([]);
	});

	test('AC-UPLOAD-006: 커스텀이 정확히 200개일 때 201번째 추가는 EXT_LIMIT_REACHED이고 카운트가 그대로 200이다', async () => {
		await db.query(
			`INSERT INTO blocked_extension (extension, kind, is_blocked)
			 SELECT 'c' || i, 'custom', true FROM generate_series(1, 200) AS i`
		);
		const result = await addCustom(db, 'overflow');
		expect(result).toEqual({ ok: false, code: 'EXT_LIMIT_REACHED' });
		const countRows = await db.query<{ count: string }>(
			"SELECT count(*) FROM blocked_extension WHERE kind = 'custom'"
		);
		expect(Number(countRows[0].count)).toBe(200);
	});
});

describe('deleteCustom', () => {
	test('AC-UPLOAD-007: sh를 삭제하면 DB에서 행이 사라진다', async () => {
		await addCustom(db, 'sh');
		await deleteCustom(db, 'sh');
		const rows = await db.query("SELECT 1 FROM blocked_extension WHERE extension = 'sh'");
		expect(rows).toEqual([]);
	});

	test('존재하지 않는 확장자를 삭제해도 에러 없이 종료된다(멱등)', async () => {
		await expect(deleteCustom(db, 'zzz')).resolves.toBeUndefined();
	});
});

describe('addCustom 예외 처리 (스텁 Db)', () => {
	test('UNIQUE 위반이 아닌 에러는 그대로 다시 던진다', async () => {
		const boom = new Error('connection reset');
		const stub: Db = {
			query: async () => {
				throw boom;
			}
		};
		await expect(addCustom(stub, 'sh')).rejects.toBe(boom);
	});

	test('code 필드 없이 message만으로 UNIQUE 위반을 알리는 드라이버(Neon형)도 인식한다', async () => {
		let callCount = 0;
		const stub: Db = {
			query: async <T>() => {
				callCount += 1;
				if (callCount === 1) {
					throw new Error('duplicate key value violates unique constraint');
				}
				return [{ kind: 'custom' }] as T[];
			}
		};
		const result = await addCustom(stub, 'sh');
		expect(result).toEqual({ ok: false, code: 'EXT_DUPLICATE' });
	});
});

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { loadMigrations } from '../../../../scripts/migrate';

let db: PGlite;

beforeAll(async () => {
	db = new PGlite();
	const migrations = await loadMigrations();
	for (const migration of migrations) {
		await db.exec(migration.sql);
	}
});

afterAll(async () => {
	await db.close();
});

describe('blocked_extension 시드', () => {
	test('고정 확장자 7개가 모두 is_blocked=false로 시드되고 sort_order 1..7이다', async () => {
		const result = await db.query<{
			extension: string;
			is_blocked: boolean;
			sort_order: number;
		}>(
			"SELECT extension, is_blocked, sort_order FROM blocked_extension WHERE kind = 'fixed' ORDER BY sort_order"
		);
		expect(result.rows).toHaveLength(7);
		expect(result.rows.every((row) => row.is_blocked === false)).toBe(true);
		expect(result.rows.map((row) => row.sort_order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
		expect(result.rows.map((row) => row.extension)).toEqual([
			'bat',
			'cmd',
			'com',
			'cpl',
			'exe',
			'scr',
			'js'
		]);
	});

	test('UNIQUE(extension) 제약 위반 시 중복 삽입을 거부한다', async () => {
		await expect(
			db.query("INSERT INTO blocked_extension (extension, kind) VALUES ('exe', 'custom')")
		).rejects.toThrow();
	});

	test('CHECK kind 제약은 fixed/custom 이외의 값을 거부한다', async () => {
		await expect(
			db.query("INSERT INTO blocked_extension (extension, kind) VALUES ('zzz', 'other')")
		).rejects.toThrow();
	});

	test.each(['Exe', 'tar.gz', 'a'.repeat(21), ''])(
		'CHECK format 제약(^[a-z0-9]{1,20}$)은 %j 를 거부한다',
		async (extension) => {
			await expect(
				db.query('INSERT INTO blocked_extension (extension, kind) VALUES ($1, $2)', [
					extension,
					'custom'
				])
			).rejects.toThrow();
		}
	);
});

describe('upload_attempt', () => {
	test('outcome CHECK 제약은 accepted/rejected 이외의 값을 거부한다', async () => {
		await expect(
			db.query(
				"INSERT INTO upload_attempt (original_name, size_bytes, outcome) VALUES ('pending-case.txt', 10, 'pending')"
			)
		).rejects.toThrow();
	});

	test('accepted outcome은 정상적으로 삽입된다', async () => {
		await db.query(
			"INSERT INTO upload_attempt (original_name, size_bytes, outcome) VALUES ('accepted-case.txt', 10, 'accepted')"
		);
		const result = await db.query<{ outcome: string }>(
			"SELECT outcome FROM upload_attempt WHERE original_name = 'accepted-case.txt'"
		);
		expect(result.rows).toEqual([{ outcome: 'accepted' }]);
	});
});

describe('인덱스', () => {
	test('upload_attempt_created_at_idx 인덱스가 존재한다', async () => {
		const result = await db.query<{ indexname: string }>(
			"SELECT indexname FROM pg_indexes WHERE tablename = 'upload_attempt' AND indexname = 'upload_attempt_created_at_idx'"
		);
		expect(result.rows).toHaveLength(1);
	});
});

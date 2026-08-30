import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '../../../../scripts/migrate';
import { createRowsAdapter, type Db } from './client';
import { recordUploadAttempt } from './upload-repo';

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

describe('recordUploadAttempt', () => {
	test('수락 1건 + 거부 1건을 각각 삽입하면 upload_attempt에 정확히 2행이 남는다', async () => {
		await recordUploadAttempt(db, {
			originalName: 'photo.jpg',
			extension: 'jpg',
			declaredMime: 'image/jpeg',
			detectedMime: 'image/jpeg',
			sizeBytes: 1024,
			outcome: 'accepted',
			reasonCode: null,
			blobPathname: 'uploads/11111111-1111-4111-8111-111111111111'
		});
		await recordUploadAttempt(db, {
			originalName: 'setup.exe',
			extension: 'exe',
			declaredMime: 'application/octet-stream',
			detectedMime: null,
			sizeBytes: 2048,
			outcome: 'rejected',
			reasonCode: 'BLOCKED_EXTENSION',
			blobPathname: null
		});

		const rows = await db.query<{
			original_name: string;
			extension: string | null;
			outcome: string;
			reason_code: string | null;
			blob_pathname: string | null;
			size_bytes: number;
		}>(
			'SELECT original_name, extension, outcome, reason_code, blob_pathname, size_bytes FROM upload_attempt ORDER BY id ASC'
		);

		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({
			original_name: 'photo.jpg',
			extension: 'jpg',
			outcome: 'accepted',
			reason_code: null,
			blob_pathname: 'uploads/11111111-1111-4111-8111-111111111111',
			size_bytes: 1024
		});
		expect(rows[1]).toMatchObject({
			original_name: 'setup.exe',
			extension: 'exe',
			outcome: 'rejected',
			reason_code: 'BLOCKED_EXTENSION',
			blob_pathname: null,
			size_bytes: 2048
		});
	});
});

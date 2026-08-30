import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '../../../../scripts/migrate';
import { createRowsAdapter, type Db } from '$lib/server/db/client';
import { addCustom, deleteCustom, setFixedBlocked } from '$lib/server/db/policy-repo';
import type { BlobStore } from '$lib/server/blob/store';
import { MAX_UPLOAD_BYTES } from '$lib/constants';
import { POST } from './+server';

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

function fakeBlobStore(): { store: BlobStore; puts: { pathname: string; contentType: string }[] } {
	const puts: { pathname: string; contentType: string }[] = [];
	const store: BlobStore = {
		async put(pathname, _body, contentType) {
			puts.push({ pathname, contentType });
			return { pathname };
		}
	};
	return { store, puts };
}

interface UploadJsonResponse {
	ok: boolean;
	originalName?: string;
	mismatch?: boolean;
	detectedMime?: string;
	error?: { code: string; message: string; details?: Record<string, unknown> };
}

async function readJson(response: Response): Promise<UploadJsonResponse> {
	return (await response.json()) as UploadJsonResponse;
}

function makeFile(bytes: Uint8Array, name: string, type = ''): File {
	// TS 6의 lib.dom.d.ts는 BlobPart로 Uint8Array<ArrayBufferLike>를 받지 않는다
	// (Uint8Array<ArrayBuffer>만 허용) — 타입 단언일 뿐 런타임 바이트는 그대로다.
	return new File([bytes as BlobPart], name, type ? { type } : undefined);
}

function uploadRequest(file: File): Request {
	const formData = new FormData();
	formData.append('file', file);
	return new Request('http://localhost/api/upload', { method: 'POST', body: formData });
}

async function uploadRowCount(): Promise<number> {
	const rows = await db.query<{ count: string }>('SELECT count(*) FROM upload_attempt');
	return Number(rows[0].count);
}

async function lastUploadRow() {
	const rows = await db.query<{
		original_name: string;
		extension: string | null;
		outcome: string;
		reason_code: string | null;
		blob_pathname: string | null;
		detected_mime: string | null;
	}>(
		'SELECT original_name, extension, outcome, reason_code, blob_pathname, detected_mime FROM upload_attempt ORDER BY id DESC LIMIT 1'
	);
	return rows[0];
}

// signature.test.ts와 동일한 이진 픽스처 구성을 재사용한다(단일 원본은 아니지만
// 같은 값이 프로젝트 전체에서 반복 검증되도록 값을 맞춘다).
function bytes(...values: number[]): Uint8Array {
	return new Uint8Array(values);
}

function padded(prefix: number[], totalLength = 32): Uint8Array {
	const buf = new Uint8Array(totalLength);
	buf.set(prefix);
	return buf;
}

function textBytes(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

function pngBytes(): Uint8Array {
	return bytes(
		0x89,
		0x50,
		0x4e,
		0x47,
		0x0d,
		0x0a,
		0x1a,
		0x0a,
		0x00,
		0x00,
		0x00,
		0x0d,
		0x49,
		0x48,
		0x44,
		0x52,
		...new Array(13).fill(0),
		...new Array(4).fill(0)
	);
}

function jpegBytes(): Uint8Array {
	return bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01);
}

function tiffBytes(): Uint8Array {
	const buf = new Uint8Array(64);
	const view = new DataView(buf.buffer);
	buf[0] = 0x49;
	buf[1] = 0x49;
	view.setUint16(2, 42, true);
	view.setUint32(4, 8, true);
	view.setUint16(8, 1, true);
	view.setUint16(10, 256, true);
	view.setUint16(12, 3, true);
	view.setUint32(14, 1, true);
	view.setUint32(18, 16, true);
	view.setUint32(22, 0, true);
	return buf;
}

describe('POST /api/upload', () => {
	test('AC-UPLOAD-008: exe 차단 상태에서 setup.exe → 415 BLOCKED_EXTENSION, Blob 미생성', async () => {
		await setFixedBlocked(db, 'exe', true);
		const { store, puts } = fakeBlobStore();
		const response = await POST({
			request: uploadRequest(makeFile(padded([0x00]), 'setup.exe')),
			locals: { db, blob: store }
		} as never);
		const body = await readJson(response);
		expect(response.status).toBe(415);
		expect(body.error?.code).toBe('BLOCKED_EXTENSION');
		expect(body.error?.details).toEqual({ matched: 'exe' });
		expect(puts).toHaveLength(0);
		expect(await uploadRowCount()).toBe(1);
	});

	test('AC-UPLOAD-009a: exe 차단 상태에서 report.exe.txt → 마지막 세그먼트가 txt여도 matched: exe', async () => {
		await setFixedBlocked(db, 'exe', true);
		const { store } = fakeBlobStore();
		const response = await POST({
			request: uploadRequest(makeFile(padded([0x00]), 'report.exe.txt')),
			locals: { db, blob: store }
		} as never);
		const body = await readJson(response);
		expect(response.status).toBe(415);
		expect(body.error?.details).toEqual({ matched: 'exe' });
	});

	test('AC-UPLOAD-009b: 커스텀 env 차단 상태에서 .env → matched: env', async () => {
		await addCustom(db, 'env');
		const { store } = fakeBlobStore();
		const response = await POST({
			request: uploadRequest(makeFile(padded([0x00]), '.env')),
			locals: { db, blob: store }
		} as never);
		const body = await readJson(response);
		expect(response.status).toBe(415);
		expect(body.error?.details).toEqual({ matched: 'env' });
	});

	test('AC-UPLOAD-010: 빈 차단 목록에서 README(확장자 없음) → 415 NO_EXTENSION', async () => {
		const { store } = fakeBlobStore();
		const response = await POST({
			request: uploadRequest(makeFile(padded([0x00]), 'README')),
			locals: { db, blob: store }
		} as never);
		const body = await readJson(response);
		expect(response.status).toBe(415);
		expect(body.error?.code).toBe('NO_EXTENSION');
	});

	test('AC-UPLOAD-010: 빈 차단 목록에서 PNG 내용의 notes.txt → 성공 + mismatch 기록', async () => {
		const { store, puts } = fakeBlobStore();
		const response = await POST({
			request: uploadRequest(makeFile(pngBytes(), 'notes.txt', 'text/plain')),
			locals: { db, blob: store }
		} as never);
		const body = await readJson(response);
		expect(response.status).toBe(200);
		expect(body.ok).toBe(true);
		expect(body.mismatch).toBe(true);
		expect(body.detectedMime).toBe('image/png');
		expect(puts).toHaveLength(1);
		const row = await lastUploadRow();
		expect(row.outcome).toBe('accepted');
		expect(row.detected_mime).toBe('image/png');
	});

	test('AC-UPLOAD-011: Content-Length가 4MB를 초과하면 본문을 읽기 전에 413, 행 없음', async () => {
		const formDataSpy = vi.fn();
		const request = {
			headers: new Headers({ 'content-length': String(MAX_UPLOAD_BYTES + 1) }),
			formData: formDataSpy
		};
		const { store, puts } = fakeBlobStore();
		const response = await POST({ request, locals: { db, blob: store } } as never);
		const body = await readJson(response);
		expect(response.status).toBe(413);
		expect(body.error?.code).toBe('FILE_TOO_LARGE');
		expect(formDataSpy).not.toHaveBeenCalled();
		expect(puts).toHaveLength(0);
		expect(await uploadRowCount()).toBe(0);
	});

	test('AC-UPLOAD-011: 헤더 없이 실제로 4MB를 초과하는 파일 → 413 + 행 1개', async () => {
		const { store, puts } = fakeBlobStore();
		const oversized = new Uint8Array(MAX_UPLOAD_BYTES + 1);
		const response = await POST({
			request: uploadRequest(makeFile(oversized, 'big.bin')),
			locals: { db, blob: store }
		} as never);
		const body = await readJson(response);
		expect(response.status).toBe(413);
		expect(body.error?.code).toBe('FILE_TOO_LARGE');
		expect(puts).toHaveLength(0);
		expect(await uploadRowCount()).toBe(1);
	}, 15000);

	test('AC-UPLOAD-012: exe 차단 + PE 내용의 photo.jpg → SIGNATURE_BLOCKED(detected: exe)', async () => {
		await setFixedBlocked(db, 'exe', true);
		const { store } = fakeBlobStore();
		const response = await POST({
			request: uploadRequest(makeFile(padded([0x4d, 0x5a]), 'photo.jpg')),
			locals: { db, blob: store }
		} as never);
		const body = await readJson(response);
		expect(response.status).toBe(415);
		expect(body.error?.code).toBe('SIGNATURE_BLOCKED');
		expect(body.error?.details).toEqual({ detected: 'exe' });
	});

	test('AC-UPLOAD-012: exe 미체크 상태에서 같은 파일 → 통과', async () => {
		const { store } = fakeBlobStore();
		const response = await POST({
			request: uploadRequest(makeFile(padded([0x4d, 0x5a]), 'photo.jpg')),
			locals: { db, blob: store }
		} as never);
		expect(response.status).toBe(200);
	});

	test('AC-UPLOAD-013: 차단 목록에 jpg/jpeg 없을 때 실제 JPEG 내용의 photo.jpeg → 성공', async () => {
		const { store } = fakeBlobStore();
		const response = await POST({
			request: uploadRequest(makeFile(jpegBytes(), 'photo.jpeg', 'image/jpeg')),
			locals: { db, blob: store }
		} as never);
		const body = await readJson(response);
		expect(response.status).toBe(200);
		expect(body.mismatch).toBeFalsy();
	});

	test('AC-UPLOAD-013: 실제 PNG 내용의 notes.txt → 성공 + mismatch:true', async () => {
		const { store } = fakeBlobStore();
		const response = await POST({
			request: uploadRequest(makeFile(pngBytes(), 'notes.txt')),
			locals: { db, blob: store }
		} as never);
		const body = await readJson(response);
		expect(response.status).toBe(200);
		expect(body.mismatch).toBe(true);
	});

	test('AC-UPLOAD-014: html 미차단 시 평범한 page.html → 성공', async () => {
		const { store } = fakeBlobStore();
		const response = await POST({
			request: uploadRequest(makeFile(textBytes('<!DOCTYPE html>\n<html></html>'), 'page.html')),
			locals: { db, blob: store }
		} as never);
		expect(response.status).toBe(200);
	});

	// 발견된 편차: 파일명이 문자 그대로 "page.html"이면 html을 커스텀 차단한 뒤에는
	// 확장자 대조(REQ-UPLOAD-008, decideUpload 3단계)가 시그니처 대조(REQ-UPLOAD-009,
	// 4단계)보다 먼저 실행되어 BLOCKED_EXTENSION으로 거부된다 — SIGNATURE_BLOCKED에
	// 도달하지 않는다. decideUpload는 M1 PRESERVE 대상이라 순서를 바꾸지 않았다.
	test('AC-UPLOAD-014: html을 커스텀 차단 후 같은 파일(page.html) → 확장자 대조가 먼저 걸려 BLOCKED_EXTENSION', async () => {
		await addCustom(db, 'html');
		const { store } = fakeBlobStore();
		const response = await POST({
			request: uploadRequest(makeFile(textBytes('<!DOCTYPE html>\n<html></html>'), 'page.html')),
			locals: { db, blob: store }
		} as never);
		const body = await readJson(response);
		expect(response.status).toBe(415);
		expect(body.error?.code).toBe('BLOCKED_EXTENSION');
	});

	// AC-UPLOAD-014의 취지(html 내용도 시그니처로 차단될 수 있어야 한다)는 확장자 자체가
	// html이 아닌 파일로 검증한다 — 위장된 html 콘텐츠를 prefix 스니핑이 잡아내는 경로.
	test('AC-UPLOAD-014 취지 확인: 확장자가 html이 아닌 위장 파일(notes.dat)도 html 내용이면 SIGNATURE_BLOCKED', async () => {
		await addCustom(db, 'html');
		const { store } = fakeBlobStore();
		const response = await POST({
			request: uploadRequest(makeFile(textBytes('<!DOCTYPE html>\n<html></html>'), 'notes.dat')),
			locals: { db, blob: store }
		} as never);
		const body = await readJson(response);
		expect(response.status).toBe(415);
		expect(body.error?.code).toBe('SIGNATURE_BLOCKED');
		expect(body.error?.details).toEqual({ detected: 'html' });
	});

	test('AC-UPLOAD-015: 차단 1건 + 정상 1건 → 정확히 2행, blob_pathname은 원본명·확장자 미포함', async () => {
		await setFixedBlocked(db, 'exe', true);
		const { store } = fakeBlobStore();
		await POST({
			request: uploadRequest(makeFile(padded([0x00]), 'setup.exe')),
			locals: { db, blob: store }
		} as never);
		await POST({
			request: uploadRequest(makeFile(padded([0x00]), 'photo.jpg')),
			locals: { db, blob: store }
		} as never);

		expect(await uploadRowCount()).toBe(2);
		const rows = await db.query<{
			outcome: string;
			blob_pathname: string | null;
			original_name: string;
		}>('SELECT outcome, blob_pathname, original_name FROM upload_attempt ORDER BY id ASC');
		expect(rows[0].outcome).toBe('rejected');
		expect(rows[0].blob_pathname).toBeNull();
		expect(rows[0].original_name).toBe('setup.exe');
		expect(rows[1].outcome).toBe('accepted');
		expect(rows[1].blob_pathname).toMatch(/^uploads\/[0-9a-f-]{36}$/);
		expect(rows[1].blob_pathname).not.toContain('photo');
		expect(rows[1].blob_pathname).not.toContain('.jpg');
		expect(rows[1].original_name).toBe('photo.jpg');
	});

	test('AC-UPLOAD-007 2절: 커스텀 sh 차단 시 script.sh → 415, 삭제 후 같은 업로드는 성공', async () => {
		await addCustom(db, 'sh');
		const { store } = fakeBlobStore();
		const blocked = await POST({
			request: uploadRequest(makeFile(padded([0x00]), 'script.sh')),
			locals: { db, blob: store }
		} as never);
		expect(blocked.status).toBe(415);

		await deleteCustom(db, 'sh');
		const allowed = await POST({
			request: uploadRequest(makeFile(padded([0x00]), 'script.sh')),
			locals: { db, blob: store }
		} as never);
		expect(allowed.status).toBe(200);
	});

	test('엣지: #!/bin/sh 바이트 + 커스텀 sh 차단 → SIGNATURE_BLOCKED', async () => {
		await addCustom(db, 'sh');
		const { store } = fakeBlobStore();
		const response = await POST({
			request: uploadRequest(makeFile(textBytes('#!/bin/sh\necho hi\n'), 'notes.txt')),
			locals: { db, blob: store }
		} as never);
		const body = await readJson(response);
		expect(response.status).toBe(415);
		expect(body.error?.code).toBe('SIGNATURE_BLOCKED');
	});

	test('엣지: TIFF 리틀엔디언 매직 + 미차단 → scan.tiff 성공(오거부 없음)', async () => {
		const { store } = fakeBlobStore();
		const response = await POST({
			request: uploadRequest(makeFile(tiffBytes(), 'scan.tiff')),
			locals: { db, blob: store }
		} as never);
		expect(response.status).toBe(200);
	});

	test('엣지: ..\\..\\etc\\passwd → 경로 구분자 제거 후 확장자 후보 없음 → NO_EXTENSION', async () => {
		const { store } = fakeBlobStore();
		const response = await POST({
			request: uploadRequest(makeFile(padded([0x00]), '..\\..\\etc\\passwd')),
			locals: { db, blob: store }
		} as never);
		const body = await readJson(response);
		expect(response.status).toBe(415);
		expect(body.error?.code).toBe('NO_EXTENSION');
	});

	// 발견된 편차: extension.test.ts의 300자 픽스처('a'.repeat(300) + '.txt')는 정확히
	// 이 값으로 normalizeFilename의 "예외 없음 + 255바이트 이하"만 단언한다(확장자
	// 보존은 단언하지 않는다). 255바이트 절단은 뒤쪽(확장자)부터가 아니라 앞에서부터
	// 담을 수 있는 만큼만 담으므로, 296바이트를 넘는 'a' 연속 뒤에 붙는 '.txt'는
	// 절단 경계 밖으로 밀려나 사라진다 — 결과적으로 확장자 후보가 없는 254개 'a'만
	// 남는다. 즉 "예외 없이 처리"는 200이 아니라 415 NO_EXTENSION으로도 참이다.
	test('엣지: 300자 파일명도 예외 없이 처리되지만, 255바이트 절단으로 확장자가 사라져 NO_EXTENSION이다', async () => {
		const { store } = fakeBlobStore();
		const longName = 'a'.repeat(300) + '.txt';
		const response = await POST({
			request: uploadRequest(makeFile(padded([0x00]), longName)),
			locals: { db, blob: store }
		} as never);
		const body = await readJson(response);
		expect(response.status).toBe(415);
		expect(body.error?.code).toBe('NO_EXTENSION');
		const row = await lastUploadRow();
		expect(Buffer.byteLength(row.original_name, 'utf8')).toBeLessThanOrEqual(255);
	});

	// 위 발견과 별개로, 확장자가 살아남는 형태로 "예외 없이 정상 업로드" 경로도
	// 명시적으로 확인한다 — 절단 경계 안에 확장자까지 들어오도록 base 길이를 줄인다.
	test('엣지: 절단 후에도 확장자가 남는 긴 파일명은 정상 업로드된다', async () => {
		const { store } = fakeBlobStore();
		const longName = 'a'.repeat(250) + '.txt';
		const response = await POST({
			request: uploadRequest(makeFile(padded([0x00]), longName)),
			locals: { db, blob: store }
		} as never);
		expect(response.status).toBe(200);
		const row = await lastUploadRow();
		expect(row.extension).toBe('txt');
		expect(Buffer.byteLength(row.original_name, 'utf8')).toBeLessThanOrEqual(255);
	});

	test('엣지: jpg 차단 상태에서 photo.jpeg → BLOCKED_EXTENSION(matched: jpg) — 파일명 후보도 대표형으로 접힌다', async () => {
		await addCustom(db, 'jpg');
		const { store } = fakeBlobStore();
		const response = await POST({
			request: uploadRequest(makeFile(padded([0x00]), 'photo.jpeg')),
			locals: { db, blob: store }
		} as never);
		const body = await readJson(response);
		expect(response.status).toBe(415);
		expect(body.error?.code).toBe('BLOCKED_EXTENSION');
		expect(body.error?.details).toEqual({ matched: 'jpg' });
	});
});
// M3 REFACTOR: upload_attempt 행과 구조화 로그 줄을 한 함수에서 함께 만들도록 묶었다.
// 아래 두 테스트가 "로그는 행의 투영"이라는 그 계약을 고정한다 — 한쪽 필드만 바뀌면 깨진다.
describe('구조화 로그는 upload_attempt 행의 투영이다', () => {
	interface UploadLogLine {
		event: string;
		outcome: string;
		reason_code: string | null;
		ext: string | null;
		size_bytes: number | null;
		declared_mime: string | null;
		detected_mime: string | null;
		original_name: string | null;
		request_id: string;
	}

	function captureUploadLogs(): { lines: UploadLogLine[]; restore: () => void } {
		const lines: UploadLogLine[] = [];
		const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
			const parsed = JSON.parse(String(args[0])) as UploadLogLine;
			if (parsed.event === 'upload_attempt') {
				lines.push(parsed);
			}
		});
		return { lines, restore: () => spy.mockRestore() };
	}

	test('수락된 업로드: 로그 1줄의 필드가 기록된 행과 일치한다', async () => {
		const { store } = fakeBlobStore();
		const { lines, restore } = captureUploadLogs();
		try {
			const response = await POST({
				request: uploadRequest(makeFile(pngBytes(), 'shot.png', 'image/png')),
				locals: { db, blob: store }
			} as never);
			expect(response.status).toBe(200);
		} finally {
			restore();
		}

		const row = await lastUploadRow();
		expect(lines).toHaveLength(1);
		expect(lines[0].outcome).toBe(row.outcome);
		expect(lines[0].reason_code).toBe(row.reason_code);
		expect(lines[0].ext).toBe(row.extension);
		expect(lines[0].detected_mime).toBe(row.detected_mime);
		expect(lines[0].original_name).toBe(row.original_name);
		// blob_pathname만 로그에 남기지 않는다 — 저장 키는 판정 근거가 아니다.
		expect(lines[0]).not.toHaveProperty('blob_pathname');
		expect(row.blob_pathname).not.toBeNull();
	});

	test('거부된 업로드: 로그 1줄의 필드가 기록된 행과 일치한다', async () => {
		await setFixedBlocked(db, 'exe', true);
		const { store } = fakeBlobStore();
		const { lines, restore } = captureUploadLogs();
		try {
			const response = await POST({
				request: uploadRequest(makeFile(padded([0x00]), 'setup.exe')),
				locals: { db, blob: store }
			} as never);
			expect(response.status).toBe(415);
		} finally {
			restore();
		}

		const row = await lastUploadRow();
		expect(lines).toHaveLength(1);
		expect(lines[0].outcome).toBe(row.outcome);
		expect(lines[0].reason_code).toBe(row.reason_code);
		expect(lines[0].ext).toBe(row.extension);
		expect(lines[0].original_name).toBe(row.original_name);
	});

	test('로그의 파일명은 64바이트로 절단되지만 upload_attempt 행은 255바이트를 유지한다', async () => {
		const longName = '가'.repeat(60) + '.txt';
		const { store } = fakeBlobStore();
		const { lines, restore } = captureUploadLogs();
		try {
			await POST({
				request: uploadRequest(makeFile(padded([0x00]), longName)),
				locals: { db, blob: store }
			} as never);
		} finally {
			restore();
		}

		const row = await lastUploadRow();
		expect(lines).toHaveLength(1);
		expect(Buffer.byteLength(lines[0].original_name ?? '', 'utf8')).toBeLessThanOrEqual(64);
		expect(Buffer.byteLength(row.original_name, 'utf8')).toBeGreaterThan(64);
		expect(row.original_name.startsWith(lines[0].original_name ?? '')).toBe(true);
	});
});

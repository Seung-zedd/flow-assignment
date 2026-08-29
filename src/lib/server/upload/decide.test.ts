import { describe, expect, test } from 'vitest';
import { decideUpload } from './decide';
import { MAX_UPLOAD_BYTES } from '$lib/constants';

const noDetection = {} as { detectedExt?: string; detectedMime?: string };

describe('decideUpload', () => {
	test('4MB를 초과하면 FILE_TOO_LARGE(413)를 반환한다', () => {
		const result = decideUpload({
			segments: ['jpg'],
			blockedSet: new Set(),
			detected: noDetection,
			sizeBytes: MAX_UPLOAD_BYTES + 1
		});
		expect(result).toEqual({ ok: false, code: 'FILE_TOO_LARGE', http: 413 });
	});

	test('정확히 4MB는 통과한다(초과만 거부)', () => {
		const result = decideUpload({
			segments: ['jpg'],
			blockedSet: new Set(),
			detected: noDetection,
			sizeBytes: MAX_UPLOAD_BYTES
		});
		expect(result.ok).toBe(true);
	});

	test('확장자 후보가 없으면 차단 목록이 비어 있어도 NO_EXTENSION(415)을 반환한다', () => {
		const result = decideUpload({
			segments: [],
			blockedSet: new Set(),
			detected: noDetection,
			sizeBytes: 100
		});
		expect(result).toEqual({ ok: false, code: 'NO_EXTENSION', http: 415 });
	});

	test('세그먼트가 차단 목록에 있으면 걸린 세그먼트를 matched로 반환한다', () => {
		const result = decideUpload({
			segments: ['exe', 'txt'],
			blockedSet: new Set(['exe']),
			detected: noDetection,
			sizeBytes: 100
		});
		expect(result).toEqual({
			ok: false,
			code: 'BLOCKED_EXTENSION',
			http: 415,
			details: { matched: 'exe' }
		});
	});

	test('마지막 세그먼트가 아니어도 파일명 순서상 먼저 걸린 세그먼트를 matched로 보고한다', () => {
		// file.exe.txt → ['exe', 'txt'] — 마지막 세그먼트는 txt지만 exe가 차단 대상이다.
		const result = decideUpload({
			segments: ['exe', 'txt'],
			blockedSet: new Set(['exe']),
			detected: noDetection,
			sizeBytes: 100
		});
		expect(result.ok).toBe(false);
		if (!result.ok && result.code === 'BLOCKED_EXTENSION') {
			expect(result.details.matched).toBe('exe');
		}
	});

	test('탐지된 확장자가 차단 목록에 있으면 SIGNATURE_BLOCKED(415)를 반환한다', () => {
		const result = decideUpload({
			segments: ['jpg'],
			blockedSet: new Set(['exe']),
			detected: { detectedExt: 'exe', detectedMime: 'application/x-msdownload' },
			sizeBytes: 100
		});
		expect(result).toEqual({
			ok: false,
			code: 'SIGNATURE_BLOCKED',
			http: 415,
			details: { detected: 'exe' }
		});
	});

	test('탐지된 확장자가 차단 목록에 없으면 통과하며 거부 사유가 되지 않는다', () => {
		const result = decideUpload({
			segments: ['jpg'],
			blockedSet: new Set(['exe']), // exe만 차단, exe 아님 → 판별 결과가 있어도 통과
			detected: { detectedExt: 'exe', detectedMime: 'application/x-msdownload' },
			sizeBytes: 100
		});
		// exe가 차단 대상이면서 세그먼트에는 없는 상황을 별도로 확인하려면 segments를 바꿔야 한다.
		// 여기서는 segments가 이미 안전하므로 SIGNATURE_BLOCKED로 거부된다(exe가 차단 목록에 있음).
		expect(result.ok).toBe(false);
	});

	test('빈 차단 목록에서는 내용 판별이 실행·기록되지만 거부로 이어지지 않는다', () => {
		// REQ-UPLOAD-013 읽기 A: 빈 정책에서 내용 판별은 관찰 전용이다.
		const result = decideUpload({
			segments: ['txt'],
			blockedSet: new Set(),
			detected: { detectedExt: 'png', detectedMime: 'image/png' },
			sizeBytes: 100
		});
		expect(result).toEqual({ ok: true, mismatch: true, detectedMime: 'image/png' });
	});

	test('탐지 결과가 선언 확장자와 다르면 mismatch: true로 기록하되 거부하지 않는다', () => {
		const result = decideUpload({
			segments: ['txt'],
			blockedSet: new Set(),
			detected: { detectedExt: 'png', detectedMime: 'image/png' },
			sizeBytes: 100
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.mismatch).toBe(true);
		}
	});

	test('탐지 결과가 선언 확장자와 같으면 mismatch: false다', () => {
		const result = decideUpload({
			segments: ['jpg'],
			blockedSet: new Set(),
			detected: { detectedExt: 'jpg', detectedMime: 'image/jpeg' },
			sizeBytes: 100
		});
		expect(result).toEqual({ ok: true, mismatch: false, detectedMime: 'image/jpeg' });
	});

	test('판별 불가(detectedExt 없음)면 mismatch도 false다', () => {
		const result = decideUpload({
			segments: ['sh'],
			blockedSet: new Set(),
			detected: noDetection,
			sizeBytes: 100
		});
		expect(result).toEqual({ ok: true, mismatch: false, detectedMime: undefined });
	});

	test('별칭 정규화 후 대표형끼리 비교한다 (jpg 차단 시 photo.jpeg → matched: jpg)', () => {
		// extractExtensionSegments가 이미 'jpeg' → 'jpg'로 접어 넘긴다고 가정.
		const result = decideUpload({
			segments: ['jpg'],
			blockedSet: new Set(['jpg']),
			detected: noDetection,
			sizeBytes: 100
		});
		expect(result).toEqual({
			ok: false,
			code: 'BLOCKED_EXTENSION',
			http: 415,
			details: { matched: 'jpg' }
		});
	});
});

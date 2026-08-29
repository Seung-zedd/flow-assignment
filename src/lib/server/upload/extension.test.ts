import { describe, expect, test } from 'vitest';
import {
	EXTENSION_ALIASES,
	canonicalizeExtension,
	extractExtensionSegments,
	normalizeExtensionInput,
	normalizeFilename
} from './extension';

describe('EXTENSION_ALIASES / canonicalizeExtension', () => {
	test.each([
		['jpeg', 'jpg'],
		['tiff', 'tif'],
		['htm', 'html'],
		['mpeg', 'mpg'],
		['yml', 'yaml'],
		['jpg', 'jpg'], // 별칭이 아닌 값은 그대로 반환
		['exe', 'exe']
	])('canonicalizeExtension(%s) → %s', (input, expected) => {
		expect(canonicalizeExtension(input)).toBe(expected);
	});

	test('별칭 표는 단일 원본이다 (5개 항목)', () => {
		expect(Object.keys(EXTENSION_ALIASES)).toHaveLength(5);
	});
});

describe('normalizeExtensionInput', () => {
	test.each([
		['sh', { ok: true, extension: 'sh' }],
		['SH', { ok: true, extension: 'sh' }],
		['jpeg', { ok: true, extension: 'jpg' }], // 저장 시에도 대표형으로 접힌다
		['ｅｘｅ', { ok: true, extension: 'exe' }], // 전각 → NFKC로 접힘
		['EXE', { ok: true, extension: 'exe' }],
		['exe.', { ok: true, extension: 'exe' }], // 후행 점 제거
		['.exe', { ok: true, extension: 'exe' }], // 선행 점 제거
		['', { ok: false, code: 'EXT_EMPTY' }],
		['   ', { ok: false, code: 'EXT_EMPTY' }],
		['.', { ok: false, code: 'EXT_EMPTY' }],
		['aaaaaaaaaaaaaaaaaaaaa', { ok: false, code: 'EXT_TOO_LONG' }], // 21자
		['ex e', { ok: false, code: 'EXT_INVALID_CHARS' }], // 공백
		['ех', { ok: false, code: 'EXT_INVALID_CHARS' }], // 키릴 호모글리프
		['a.b', { ok: false, code: 'EXT_INVALID_CHARS' }] // 내부 점
	])('normalizeExtensionInput(%j) → %j', (input, expected) => {
		expect(normalizeExtensionInput(input)).toEqual(expected);
	});
});

describe('extractExtensionSegments', () => {
	test.each([
		['file.exe.txt', ['exe', 'txt']],
		['archive.tar.gz', ['tar', 'gz']],
		['report.PDF', ['pdf']],
		['.env', ['env']],
		['README', []],
		['.', []],
		['', []],
		['photo.jpeg', ['jpg']], // 후보도 대표형으로 접힌다
		['scan.tiff', ['tif']],
		['page.htm', ['html']],
		['file.jpg.jpeg', ['jpg']] // 접힌 뒤 중복 제거(dedupe)
	])('extractExtensionSegments(%j) → %j', (input, expected) => {
		expect(extractExtensionSegments(input)).toEqual(expected);
	});
});

describe('normalizeFilename', () => {
	test('제어문자를 제거한다', () => {
		const nul = String.fromCharCode(0);
		const unitSeparator = String.fromCharCode(31);
		const withControlChars = 'a' + nul + unitSeparator + 'bc.txt';
		expect(normalizeFilename(withControlChars)).toBe('abc.txt');
	});

	test('경로 구분자(슬래시·역슬래시)를 제거한다', () => {
		const forwardSlash = String.fromCharCode(47);
		const backSlash = String.fromCharCode(92);
		const withSeparators = 'a' + forwardSlash + 'b' + backSlash + 'c.txt';
		expect(normalizeFilename(withSeparators)).toBe('abc.txt');
	});

	test('모든 ".." 시퀀스를 제거한다 (경로 순회 방어)', () => {
		const backSlash = String.fromCharCode(92);
		const traversal = `..${backSlash}..${backSlash}etc${backSlash}passwd`;
		expect(normalizeFilename(traversal)).toBe('etcpasswd');
	});

	test('앞뒤 공백을 제거한다', () => {
		expect(normalizeFilename('  photo.jpg  ')).toBe('photo.jpg');
	});

	test('300자 파일명을 255바이트로 절단하며 예외를 던지지 않는다', () => {
		const longName = 'a'.repeat(300) + '.txt';
		expect(() => normalizeFilename(longName)).not.toThrow();
		const result = normalizeFilename(longName);
		expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(255);
	});

	test('멀티바이트 문자 경계에서 코드 포인트를 쪼개지 않는다', () => {
		// 한글 3바이트 문자를 다량 반복해 255바이트 경계를 넘기되, 잘린 결과가 항상 유효한 UTF-8이어야 한다.
		const longKorean = '가'.repeat(200);
		const result = normalizeFilename(longKorean);
		expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(255);
		expect(Buffer.from(result, 'utf8').toString('utf8')).toBe(result);
	});
});

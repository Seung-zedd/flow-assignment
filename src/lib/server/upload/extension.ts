import { MAX_EXTENSION_LENGTH, MAX_FILENAME_BYTES } from '$lib/constants';

// @MX:ANCHOR: [AUTO] 별칭 표의 단일 원본 — 업로드 판정(확장자 후보·시그니처 판별)과
// 정책 저장 경로가 모두 이 표 하나만 참조한다.
// @MX:REASON: 표가 갈라지면 한쪽만 고쳐지는 순간 오탐이 조용히 돌아온다(plan.md §3.3).
export const EXTENSION_ALIASES: Record<string, string> = {
	jpeg: 'jpg',
	tiff: 'tif',
	htm: 'html',
	mpeg: 'mpg',
	yml: 'yaml'
};

export function canonicalizeExtension(extension: string): string {
	return EXTENSION_ALIASES[extension] ?? extension;
}

export interface NormalizeExtensionOk {
	ok: true;
	extension: string;
}

export interface NormalizeExtensionError {
	ok: false;
	code: 'EXT_EMPTY' | 'EXT_TOO_LONG' | 'EXT_INVALID_CHARS';
}

const EXTENSION_PATTERN = /^[a-z0-9]{1,20}$/;

// 정규화 순서(plan.md §4): NFKC → trim → 선행·후행 점 제거 → 소문자화 → 별칭 대표형 변환.
// 후행 점도 제거한다 — acceptance.md 엣지 케이스 `exe.`(후행 점) → 정규화 후 `exe`.
export function normalizeExtensionInput(
	raw: string
): NormalizeExtensionOk | NormalizeExtensionError {
	const normalized = raw
		.normalize('NFKC')
		.trim()
		.replace(/^\.+|\.+$/g, '')
		.toLowerCase();

	if (normalized.length === 0) {
		return { ok: false, code: 'EXT_EMPTY' };
	}
	if (normalized.length > MAX_EXTENSION_LENGTH) {
		return { ok: false, code: 'EXT_TOO_LONG' };
	}
	if (!EXTENSION_PATTERN.test(normalized)) {
		return { ok: false, code: 'EXT_INVALID_CHARS' };
	}

	return { ok: true, extension: canonicalizeExtension(normalized) };
}

// C0 제어문자(0x00-0x1F)와 DEL(0x7F)을 걸러내는 패턴이다. 소스에 원시 제어 바이트를 직접
// 심는 대신 코드 포인트로 조립한다 — 편집기·diff 도구에서 안전하게 다루기 위함이다.
const CONTROL_CHAR_PATTERN = new RegExp(
	'[' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + String.fromCharCode(127) + ']',
	'g'
);

// 파일명 정규화(plan.md §3 단계 3): NFC → 제어문자 제거 → 경로 구분자 제거 →
// 모든 ".." 시퀀스 제거 → trim → 255바이트로 절단(코드 포인트를 쪼개지 않음).
export function normalizeFilename(raw: string): string {
	const withoutControlChars = raw
		.normalize('NFC')
		.replace(CONTROL_CHAR_PATTERN, '')
		.replace(/[/\\]/g, '');

	let withoutTraversal = withoutControlChars;
	while (withoutTraversal.includes('..')) {
		withoutTraversal = withoutTraversal.replace(/\.\./g, '');
	}

	const trimmed = withoutTraversal.trim();

	let result = '';
	let byteLength = 0;
	for (const char of trimmed) {
		const charBytes = Buffer.byteLength(char, 'utf8');
		if (byteLength + charBytes > MAX_FILENAME_BYTES) {
			break;
		}
		result += char;
		byteLength += charBytes;
	}
	return result;
}

// 확장자 후보 추출(plan.md §3 단계 4): 소문자화 → '.'로 분해 →
// 첫 세그먼트(파일명 본체) 제외 → 빈 세그먼트 제거 → 각 후보를 대표형으로 접힘 → 순서 보존 dedupe.
export function extractExtensionSegments(normalizedName: string): string[] {
	const lower = normalizedName.toLowerCase();
	const parts = lower.split('.');
	const candidates = parts.slice(1).filter((segment) => segment.length > 0);
	const canonicalized = candidates.map((segment) => canonicalizeExtension(segment));

	const seen = new Set<string>();
	const deduped: string[] = [];
	for (const extension of canonicalized) {
		if (!seen.has(extension)) {
			seen.add(extension);
			deduped.push(extension);
		}
	}
	return deduped;
}

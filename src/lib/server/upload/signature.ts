import { fileTypeFromBuffer } from 'file-type';
import { SNIFF_BYTES } from '$lib/constants';
import { canonicalizeExtension } from './extension';

// 정책 대조에 넘어가는 탐지 결과의 모양. decideUpload의 `detected` 입력과 같은 타입을
// 여기 한 곳에서 정의한다 — 두 곳에 같은 필드를 적어 두면 한쪽만 바뀌어도 컴파일러가
// 알려주지 않는다.
export interface DetectedType {
	detectedExt?: string;
	detectedMime?: string;
}

export interface SignatureResult extends DetectedType {
	source: 'file-type' | 'prefix' | 'none';
}

function startsWithBinary(bytes: Uint8Array, signature: number[]): boolean {
	if (bytes.length < signature.length) {
		return false;
	}
	return signature.every((byte, index) => bytes[index] === byte);
}

function decodeLeadingText(bytes: Uint8Array, maxLength = 64): string {
	const sample = bytes.subarray(0, Math.min(bytes.length, maxLength));
	return new TextDecoder('utf-8', { fatal: false }).decode(sample);
}

const BOM = String.fromCharCode(0xfeff);

function stripBomAndLeadingWhitespace(text: string): string {
	const withoutBom = text.startsWith(BOM) ? text.slice(BOM.length) : text;
	return withoutBom.replace(/^\s+/, '');
}

// BOM·선행 공백을 허용하고 대소문자를 구분하지 않는 텍스트 prefix 매칭이다.
function startsWithTextCI(bytes: Uint8Array, prefix: string): boolean {
	const text = stripBomAndLeadingWhitespace(decodeLeadingText(bytes)).toLowerCase();
	return text.startsWith(prefix.toLowerCase());
}

interface PrefixMapping {
	match: (bytes: Uint8Array) => boolean;
	ext: string;
	mime: string;
}

// 명시적 prefix 스니핑(plan.md §3 단계 8): file-type이 원리적으로 못 잡는
// 텍스트 실행 파일·마크업을 직접 본다. 각 prefix는 합성 탐지 확장자로 매핑되고
// 그 값은 file-type 탐지 결과와 완전히 같은 정책 대조를 통과한다.
const PREFIX_MAPPINGS: readonly PrefixMapping[] = [
	{ match: (b) => startsWithBinary(b, [0x4d, 0x5a]), ext: 'exe', mime: 'application/x-msdownload' },
	{
		match: (b) => startsWithBinary(b, [0x7f, 0x45, 0x4c, 0x46]),
		ext: 'elf',
		mime: 'application/x-elf'
	},
	{ match: (b) => startsWithTextCI(b, '#!'), ext: 'sh', mime: 'text/x-shellscript' },
	{ match: (b) => startsWithTextCI(b, '<?php'), ext: 'php', mime: 'application/x-httpd-php' },
	{ match: (b) => startsWithTextCI(b, '<svg'), ext: 'svg', mime: 'image/svg+xml' },
	{
		match: (b) =>
			startsWithTextCI(b, '<script') ||
			startsWithTextCI(b, '<!doctype html') ||
			startsWithTextCI(b, '<html'),
		ext: 'html',
		mime: 'text/html'
	}
];

// @MX:WARN: [AUTO] 판별 불가(순수 텍스트 등)면 통과시킨다 — 확장자 정책이 1차 방어선이고
// 시그니처 검사는 보강일 뿐이다. file-type은 매직 넘버가 없는 텍스트 실행 파일(.sh 등)을
// 원리적으로 판별하지 못한다.
// @MX:REASON: plan.md §3.1 — "시그니처 검사는 확장자 정책을 보강할 뿐 대체하지 못한다."
export async function sniffSignature(bytes: Uint8Array): Promise<SignatureResult> {
	const sample = bytes.subarray(0, SNIFF_BYTES);

	const detected = await fileTypeFromBuffer(sample);
	if (detected) {
		return {
			detectedExt: canonicalizeExtension(detected.ext),
			detectedMime: detected.mime,
			source: 'file-type'
		};
	}

	for (const mapping of PREFIX_MAPPINGS) {
		if (mapping.match(sample)) {
			return {
				detectedExt: canonicalizeExtension(mapping.ext),
				detectedMime: mapping.mime,
				source: 'prefix'
			};
		}
	}

	return { source: 'none' };
}

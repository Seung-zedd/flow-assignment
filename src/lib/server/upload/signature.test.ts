import { describe, expect, test } from 'vitest';
import { sniffSignature } from './signature';

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

// 최소 유효 리틀엔디언 TIFF — file-type은 서명 4바이트만으로는 판별하지 않고 첫 IFD까지
// 읽으므로 엔트리 1개짜리 IFD를 실제로 구성한다.
function tiffBytes(): Uint8Array {
	const buf = new Uint8Array(64);
	const view = new DataView(buf.buffer);
	buf[0] = 0x49; // 'I'
	buf[1] = 0x49; // 'I' — 리틀엔디언 바이트 순서
	view.setUint16(2, 42, true); // 매직 0x002A
	view.setUint32(4, 8, true); // 첫 IFD 오프셋
	view.setUint16(8, 1, true); // IFD 엔트리 수 = 1
	view.setUint16(10, 256, true); // 태그 0x0100 (ImageWidth)
	view.setUint16(12, 3, true); // 값 타입 SHORT
	view.setUint32(14, 1, true); // 값 개수
	view.setUint32(18, 16, true); // 값
	view.setUint32(22, 0, true); // 다음 IFD 없음
	return buf;
}

describe('sniffSignature', () => {
	test('PE 실행 파일(MZ 헤더) → exe', async () => {
		const peBytes = padded([0x4d, 0x5a]);
		const result = await sniffSignature(peBytes);
		expect(result.detectedExt).toBe('exe');
		expect(result.detectedMime).toBe('application/x-msdownload');
	});

	test('ELF 실행 파일(\\x7fELF 헤더) → elf', async () => {
		const elfBytes = padded([0x7f, 0x45, 0x4c, 0x46]);
		const result = await sniffSignature(elfBytes);
		expect(result.detectedExt).toBe('elf');
		expect(result.detectedMime).toBe('application/x-elf');
	});

	test('JPEG(FF D8 FF E0 … JFIF) → jpg (file-type 탐지)', async () => {
		const jpegBytes = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01);
		const result = await sniffSignature(jpegBytes);
		expect(result.detectedExt).toBe('jpg');
		expect(result.source).toBe('file-type');
	});

	test('PNG(89 50 4E 47 0D 0A 1A 0A + IHDR 청크) → png (file-type 탐지)', async () => {
		// PNG 판별기는 서명 8바이트 뒤에 실제 IHDR 청크(길이 13 + "IHDR" + 데이터 13바이트 +
		// CRC 4바이트)까지 읽는다 — 서명 8바이트만으로는 undefined를 반환한다.
		const pngBytes = bytes(
			0x89,
			0x50,
			0x4e,
			0x47,
			0x0d,
			0x0a,
			0x1a,
			0x0a, // PNG 서명
			0x00,
			0x00,
			0x00,
			0x0d, // IHDR 청크 길이 = 13 (big-endian)
			0x49,
			0x48,
			0x44,
			0x52, // "IHDR"
			...new Array(13).fill(0), // IHDR 청크 데이터(임의 값)
			...new Array(4).fill(0) // CRC(임의 값)
		);
		const result = await sniffSignature(pngBytes);
		expect(result.detectedExt).toBe('png');
		expect(result.source).toBe('file-type');
	});

	test('#!/bin/sh shebang → sh (prefix 스니핑, file-type은 텍스트 미지원)', async () => {
		const shellScript = textBytes('#!/bin/sh\necho hello\n');
		const result = await sniffSignature(shellScript);
		expect(result.detectedExt).toBe('sh');
		expect(result.detectedMime).toBe('text/x-shellscript');
		expect(result.source).toBe('prefix');
	});

	test('<!DOCTYPE html> → html (prefix 스니핑)', async () => {
		const htmlDoc = textBytes('<!DOCTYPE html>\n<html><body>hi</body></html>');
		const result = await sniffSignature(htmlDoc);
		expect(result.detectedExt).toBe('html');
		expect(result.source).toBe('prefix');
	});

	test('<script 로 시작하는 문서도 html 합성 확장자로 매핑된다', async () => {
		const scriptDoc = textBytes('<script>alert(1)</script>');
		const result = await sniffSignature(scriptDoc);
		expect(result.detectedExt).toBe('html');
	});

	test('UTF-8 BOM · 선행 공백 · 대문자 태그가 섞여도 텍스트 prefix를 인식한다', async () => {
		// BOM(EF BB BF) + 개행/공백 + 대문자 `<?PHP` — 세 가지 관용을 한 번에 확인한다.
		const bom = [0xef, 0xbb, 0xbf];
		const withBom = new Uint8Array([...bom, ...textBytes('\n  <?PHP echo 1;')]);
		const result = await sniffSignature(withBom);
		expect(result.detectedExt).toBe('php');
		expect(result.detectedMime).toBe('application/x-httpd-php');
	});

	test('실제 TIFF 시그니처 → tif (별칭 tiff가 대표형 tif로 접힘, 오거부 회귀 방지)', async () => {
		const result = await sniffSignature(tiffBytes());
		expect(result.detectedExt).toBe('tif');
		expect(result.detectedMime).toBe('image/tiff');
		expect(result.source).toBe('file-type');
	});

	test('시그니처보다 짧은 버퍼(1바이트)도 예외 없이 판별 불가(none)로 떨어진다', async () => {
		// MZ 헤더의 앞 1바이트만 — 이진 prefix 비교의 길이-부족 조기 반환 경로.
		const result = await sniffSignature(bytes(0x4d));
		expect(result.source).toBe('none');
		expect(result.detectedExt).toBeUndefined();
	});

	test('평범한 순수 텍스트 → 판별 불가(none)', async () => {
		const plainText = textBytes('just a plain line of text with no signature at all');
		const result = await sniffSignature(plainText);
		expect(result.source).toBe('none');
		expect(result.detectedExt).toBeUndefined();
		expect(result.detectedMime).toBeUndefined();
	});
});

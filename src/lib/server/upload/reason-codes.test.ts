import { describe, expect, test } from 'vitest';
import { REASON_CODES, NOTICE_CODES, formatMessage } from './reason-codes';

// plan.md §4.1 문구 상수 표 — 확정 상수 10종 + 알림 3종을 그대로 단언한다.
describe('REASON_CODES', () => {
	test.each([
		['EXT_EMPTY', 400, '확장자를 입력해 주세요.'],
		['EXT_TOO_LONG', 400, '확장자는 최대 20자까지 입력할 수 있어요.'],
		['EXT_INVALID_CHARS', 400, '확장자는 영문 소문자와 숫자만 사용할 수 있어요.'],
		['EXT_DUPLICATE', 409, '이미 추가된 확장자예요.'],
		['EXT_IS_FIXED', 409, '고정 확장자예요. 위 체크박스에서 관리해 주세요.'],
		['EXT_LIMIT_REACHED', 409, '커스텀 확장자는 최대 200개까지 추가할 수 있어요.'],
		['BLOCKED_EXTENSION', 415, '차단된 확장자예요: {matched}'],
		['SIGNATURE_BLOCKED', 415, '파일 내용이 차단 대상 형식({detected})이에요.'],
		['NO_EXTENSION', 415, '확장자가 없어 차단 정책을 적용할 수 없어요.'],
		['FILE_TOO_LARGE', 413, '파일은 4MB까지 올릴 수 있어요.']
	])('%s → http %d, message %j', (code, http, message) => {
		expect(REASON_CODES[code as keyof typeof REASON_CODES]).toEqual({ http, message });
	});

	test('정확히 10종만 정의된다', () => {
		expect(Object.keys(REASON_CODES)).toHaveLength(10);
	});
});

describe('NOTICE_CODES', () => {
	test.each([
		['ALIAS_FOLDED', '{input}는 {canonical}와 같은 형식이라 {canonical}로 저장돼요.'],
		['CLIENT_HINT_BLOCKED', '이 확장자는 지금 차단 목록에 있어요. 올리면 서버에서 거부돼요.'],
		['CLIENT_HINT_DISCLAIMER', '이 확인은 편의용이에요. 실제 차단은 서버에서 이뤄집니다.']
	])('%s → message %j', (code, message) => {
		expect(NOTICE_CODES[code as keyof typeof NOTICE_CODES]).toEqual({ message });
	});
});

describe('formatMessage', () => {
	test('BLOCKED_EXTENSION의 {matched} 자리를 치환한다', () => {
		expect(formatMessage('BLOCKED_EXTENSION', { matched: 'exe' })).toBe('차단된 확장자예요: exe');
	});

	test('SIGNATURE_BLOCKED의 {detected} 자리를 치환한다', () => {
		expect(formatMessage('SIGNATURE_BLOCKED', { detected: 'exe' })).toBe(
			'파일 내용이 차단 대상 형식(exe)이에요.'
		);
	});

	test('ALIAS_FOLDED의 {input}·{canonical} 두 자리를 모두 치환한다', () => {
		expect(formatMessage('ALIAS_FOLDED', { input: 'jpeg', canonical: 'jpg' })).toBe(
			'jpeg는 jpg와 같은 형식이라 jpg로 저장돼요.'
		);
	});

	test('치환 자리가 없는 문구는 그대로 반환한다', () => {
		expect(formatMessage('EXT_EMPTY')).toBe('확장자를 입력해 주세요.');
	});

	test('치환 값이 빠지면 자리표시자를 그대로 남긴다(문구를 깨뜨리지 않음)', () => {
		expect(formatMessage('BLOCKED_EXTENSION')).toBe('차단된 확장자예요: {matched}');
	});
});

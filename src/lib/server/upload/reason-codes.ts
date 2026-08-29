// 사유 코드 ↔ 상태 코드 ↔ 사용자 문구 매핑. plan.md §4.1 문구 상수 표가 단일 원본이며,
// 여기 적힌 문자열은 확정 상수다 — 임의로 다듬지 않는다.

export type ReasonCode =
	| 'EXT_EMPTY'
	| 'EXT_TOO_LONG'
	| 'EXT_INVALID_CHARS'
	| 'EXT_DUPLICATE'
	| 'EXT_IS_FIXED'
	| 'EXT_LIMIT_REACHED'
	| 'BLOCKED_EXTENSION'
	| 'SIGNATURE_BLOCKED'
	| 'NO_EXTENSION'
	| 'FILE_TOO_LARGE';

export type NoticeCode = 'ALIAS_FOLDED' | 'CLIENT_HINT_BLOCKED' | 'CLIENT_HINT_DISCLAIMER';

interface ReasonCodeEntry {
	http: number;
	message: string;
}

interface NoticeCodeEntry {
	message: string;
}

export const REASON_CODES: Readonly<Record<ReasonCode, ReasonCodeEntry>> = {
	EXT_EMPTY: { http: 400, message: '확장자를 입력해 주세요.' },
	EXT_TOO_LONG: { http: 400, message: '확장자는 최대 20자까지 입력할 수 있어요.' },
	EXT_INVALID_CHARS: { http: 400, message: '확장자는 영문 소문자와 숫자만 사용할 수 있어요.' },
	EXT_DUPLICATE: { http: 409, message: '이미 추가된 확장자예요.' },
	EXT_IS_FIXED: { http: 409, message: '고정 확장자예요. 위 체크박스에서 관리해 주세요.' },
	EXT_LIMIT_REACHED: { http: 409, message: '커스텀 확장자는 최대 200개까지 추가할 수 있어요.' },
	BLOCKED_EXTENSION: { http: 415, message: '차단된 확장자예요: {matched}' },
	SIGNATURE_BLOCKED: { http: 415, message: '파일 내용이 차단 대상 형식({detected})이에요.' },
	NO_EXTENSION: { http: 415, message: '확장자가 없어 차단 정책을 적용할 수 없어요.' },
	FILE_TOO_LARGE: { http: 413, message: '파일은 4MB까지 올릴 수 있어요.' }
};

export const NOTICE_CODES: Readonly<Record<NoticeCode, NoticeCodeEntry>> = {
	ALIAS_FOLDED: { message: '{input}는 {canonical}와 같은 형식이라 {canonical}로 저장돼요.' },
	CLIENT_HINT_BLOCKED: {
		message: '이 확장자는 지금 차단 목록에 있어요. 올리면 서버에서 거부돼요.'
	},
	CLIENT_HINT_DISCLAIMER: { message: '이 확인은 편의용이에요. 실제 차단은 서버에서 이뤄집니다.' }
};

function isReasonCode(code: ReasonCode | NoticeCode): code is ReasonCode {
	return code in REASON_CODES;
}

export function formatMessage(
	code: ReasonCode | NoticeCode,
	params: Record<string, string> = {}
): string {
	const template = isReasonCode(code) ? REASON_CODES[code].message : NOTICE_CODES[code].message;
	return template.replace(/\{(\w+)\}/g, (_match, key: string) => params[key] ?? `{${key}}`);
}

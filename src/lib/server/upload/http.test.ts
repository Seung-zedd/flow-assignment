import { describe, expect, test } from 'vitest';
import { errorResponse } from './http';
import { REASON_CODES, type ReasonCode } from './reason-codes';

// M3 REFACTOR에서 업로드 라우트와 정책 라우트가 각각 들고 있던 오류 봉투를 한 곳으로
// 모았다. 이 파일은 그 통합이 기존 응답을 바꾸지 않았음을 고정한다.
describe('errorResponse (오류 봉투 단일 원본)', () => {
	test('봉투 모양은 { ok:false, error:{ code, message, details } } 하나뿐이다', async () => {
		const response = errorResponse('EXT_EMPTY');
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(400);
		expect(Object.keys(body).sort()).toEqual(['error', 'ok']);
		expect(body.ok).toBe(false);
		expect(Object.keys(body.error as object).sort()).toEqual(['code', 'details', 'message']);
	});

	test('대입값이 없으면 details는 빈 객체로 존재한다(키 자체는 사라지지 않는다)', async () => {
		const body = (await errorResponse('EXT_EMPTY').json()) as { error: { details: unknown } };
		expect(body.error.details).toEqual({});
	});

	test('대입값이 있으면 문구에 채워 넣고 details로도 그대로 돌려준다', async () => {
		const response = errorResponse('BLOCKED_EXTENSION', { matched: 'exe' });
		const body = (await response.json()) as {
			error: { code: string; message: string; details: unknown };
		};

		expect(response.status).toBe(415);
		expect(body.error.code).toBe('BLOCKED_EXTENSION');
		expect(body.error.message).toBe('차단된 확장자예요: exe');
		expect(body.error.details).toEqual({ matched: 'exe' });
	});

	// 통합 전 정책 라우트는 formatMessage()가 아니라 REASON_CODES[code].message를 그대로
	// 내려주고 있었다. 정책 라우트가 낼 수 있는 코드에는 {대입값} 자리가 없으므로 두 값이
	// 같고, 그래서 통합으로 문구가 바뀌지 않는다 — 그 전제를 코드로 고정한다.
	const POLICY_CODES: ReasonCode[] = [
		'EXT_EMPTY',
		'EXT_TOO_LONG',
		'EXT_INVALID_CHARS',
		'EXT_DUPLICATE',
		'EXT_IS_FIXED',
		'EXT_LIMIT_REACHED'
	];

	test.each(POLICY_CODES)(
		'%s의 문구·상태 코드는 REASON_CODES 표와 글자 그대로 같다',
		async (code) => {
			const response = errorResponse(code);
			const body = (await response.json()) as { error: { message: string } };

			expect(response.status).toBe(REASON_CODES[code].http);
			expect(body.error.message).toBe(REASON_CODES[code].message);
			expect(REASON_CODES[code].message).not.toMatch(/\{\w+\}/);
		}
	);
});

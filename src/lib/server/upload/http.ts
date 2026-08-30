import { json } from '@sveltejs/kit';
import { formatMessage, REASON_CODES, type ReasonCode } from './reason-codes';

// 오류 봉투의 단일 원본. 업로드·정책 라우트가 같은 모양을 돌려주게 한다 —
// 봉투는 { ok:false, error:{ code, message, details } } 하나뿐이고, details는
// 대입값이 없는 코드에서도 빈 객체로 항상 존재한다. 클라이언트가 키 유무로
// 분기하지 않아도 되게 하려는 것이며, 문구는 reason-codes.ts 표가 정한다.
export function errorResponse(code: ReasonCode, details?: Record<string, string>): Response {
	const entry = REASON_CODES[code];
	return json(
		{ ok: false, error: { code, message: formatMessage(code, details), details: details ?? {} } },
		{ status: entry.http }
	);
}

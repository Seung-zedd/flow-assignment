import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { normalizeExtensionCandidate, normalizeExtensionInput } from '$lib/server/upload/extension';
import { addCustom, getPolicy } from '$lib/server/db/policy-repo';
import { formatMessage, REASON_CODES, type ReasonCode } from '$lib/server/upload/reason-codes';

function errorResponse(code: ReasonCode): Response {
	const entry = REASON_CODES[code];
	return json({ ok: false, error: { code, message: entry.message } }, { status: entry.http });
}

export const POST: RequestHandler = async ({ request, locals }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return errorResponse('EXT_EMPTY');
	}

	const raw =
		typeof body === 'object' && body !== null && 'extension' in body
			? (body as { extension: unknown }).extension
			: undefined;
	const rawString = typeof raw === 'string' ? raw : '';

	const normalized = normalizeExtensionInput(rawString);
	if (!normalized.ok) {
		return errorResponse(normalized.code);
	}

	const result = await addCustom(locals.db, normalized.extension);
	if (!result.ok) {
		return errorResponse(result.code);
	}

	// 별칭 폴딩 여부 — 폴딩 전 정규화 결과와 최종 대표형이 다르면 접힘이 일어난 것이다.
	// 안내 문구의 {input}에도 원문이 아니라 이 정규화 후보를 쓴다. 접힌 것은 원문 전체가
	// 아니라 별칭 자체이고, 원문을 그대로 넣으면 `" .JPEG "는 jpg와…`처럼 공백·점·대문자가
	// 문구에 섞여 나온다(plan.md §4.1 문자열 자체는 그대로 두고 대입 값만 정한다).
	const candidate = normalizeExtensionCandidate(rawString);
	const folded = candidate !== result.extension;
	const policy = await getPolicy(locals.db);

	return json({
		ok: true,
		extension: result.extension,
		canonical: result.extension,
		...(folded
			? {
					notice: {
						code: 'ALIAS_FOLDED',
						message: formatMessage('ALIAS_FOLDED', {
							input: candidate,
							canonical: result.extension
						})
					}
				}
			: {}),
		custom: policy.custom,
		customCount: policy.customCount
	});
};

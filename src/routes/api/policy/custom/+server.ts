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
	const folded = normalizeExtensionCandidate(rawString) !== result.extension;
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
							input: rawString,
							canonical: result.extension
						})
					}
				}
			: {}),
		custom: policy.custom,
		customCount: policy.customCount
	});
};

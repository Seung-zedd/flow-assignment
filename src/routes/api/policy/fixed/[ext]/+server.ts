import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FIXED_EXTENSIONS } from '$lib/constants';
import { getPolicy, setFixedBlocked } from '$lib/server/db/policy-repo';

// spec.md §4.1 규격 밖의 라우팅·형식 오류이므로 REASON_CODES 표가 아니라
// SvelteKit의 error()로 직접 404/400을 던진다(plan.md §4 — 화면 문구는 Q12 수동 확인).
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const ext = params.ext;
	if (!(FIXED_EXTENSIONS as readonly string[]).includes(ext)) {
		throw error(404, '존재하지 않는 고정 확장자입니다.');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, '요청 본문이 올바르지 않습니다.');
	}

	if (
		typeof body !== 'object' ||
		body === null ||
		typeof (body as { blocked?: unknown }).blocked !== 'boolean'
	) {
		throw error(400, 'blocked 필드는 boolean이어야 합니다.');
	}

	await setFixedBlocked(locals.db, ext, (body as { blocked: boolean }).blocked);
	const policy = await getPolicy(locals.db);
	return json({ ok: true, fixed: policy.fixed });
};

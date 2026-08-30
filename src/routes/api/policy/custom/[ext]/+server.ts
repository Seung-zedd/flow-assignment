import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteCustom, getPolicy } from '$lib/server/db/policy-repo';

// 존재하지 않는 커스텀 확장자를 삭제해도 성공으로 취급한다(멱등, plan.md §5).
export const DELETE: RequestHandler = async ({ params, locals }) => {
	await deleteCustom(locals.db, params.ext);
	const policy = await getPolicy(locals.db);
	return json({ ok: true, custom: policy.custom, customCount: policy.customCount });
};

import type { PageServerLoad } from './$types';
import { getPolicy } from '$lib/server/db/policy-repo';
import { NOTICE_CODES } from '$lib/server/upload/reason-codes';

// 초기 정책 상태를 서버에서 렌더링한다(REQ-UPLOAD-016) — 클라이언트 스크립트 없이도
// 정책 화면이 정식 상태를 보여준다(AC-UPLOAD-016b).
export const load: PageServerLoad = async ({ locals }) => {
	const policy = await getPolicy(locals.db);
	return {
		policy,
		clientHintDisclaimer: NOTICE_CODES.CLIENT_HINT_DISCLAIMER.message
	};
};

import type { PageServerLoad } from './$types';
import { getPolicy } from '$lib/server/db/policy-repo';
import { NOTICE_CODES } from '$lib/server/upload/reason-codes';
import { EXTENSION_ALIASES } from '$lib/server/upload/extension';

// 초기 정책 상태를 서버에서 렌더링한다(REQ-UPLOAD-016) — 클라이언트 스크립트 없이도
// 정책 화면이 정식 상태를 보여준다(AC-UPLOAD-016b).
//
// blockedExtensions·extensionAliases는 클라이언트 힌트 전용 값이다. UploadArea는
// $lib/server/**를 임포트할 수 없으므로(SvelteKit 서버·클라이언트 경계) 여기서 미리
// 계산해 내려준다 — decideUpload()를 재사용하지 못하는 것이 이 값들의 존재 이유다.
export const load: PageServerLoad = async ({ locals }) => {
	const policy = await getPolicy(locals.db);
	const blockedExtensions = [
		...policy.fixed.filter((row) => row.blocked).map((row) => row.extension),
		...policy.custom.map((row) => row.extension)
	];
	return {
		policy,
		clientHintDisclaimer: NOTICE_CODES.CLIENT_HINT_DISCLAIMER.message,
		blockedExtensions,
		extensionAliases: EXTENSION_ALIASES,
		clientHintBlocked: NOTICE_CODES.CLIENT_HINT_BLOCKED.message
	};
};

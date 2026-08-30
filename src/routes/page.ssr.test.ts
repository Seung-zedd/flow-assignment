import { describe, expect, test } from 'vitest';
import { render } from 'svelte/server';
import Page from './+page.svelte';
import { NOTICE_CODES } from '$lib/server/upload/reason-codes';

// AC-UPLOAD-016b: 브라우저·스크립트 실행 없이 응답 본문만 확인한다(HTTP GET과 동등한
// 서버 렌더링 결과를 svelte/server의 render()로 직접 얻는다).
describe('AC-UPLOAD-016b: 정책 화면 SSR', () => {
	test('exe가 체크 상태로 DB에 저장되어 있으면 응답 HTML에 이미 체크된 채로 포함된다', () => {
		const data = {
			policy: {
				fixed: [
					{ extension: 'bat', blocked: false },
					{ extension: 'cmd', blocked: false },
					{ extension: 'com', blocked: false },
					{ extension: 'cpl', blocked: false },
					{ extension: 'exe', blocked: true },
					{ extension: 'scr', blocked: false },
					{ extension: 'js', blocked: false }
				],
				custom: [],
				customCount: 0
			},
			clientHintDisclaimer: NOTICE_CODES.CLIENT_HINT_DISCLAIMER.message
		};

		const { body } = render(Page, { props: { data } });

		expect(body).toContain(NOTICE_CODES.CLIENT_HINT_DISCLAIMER.message);

		const exeInputMatch = body.match(/<input[^>]*>\s*exe/);
		expect(exeInputMatch).not.toBeNull();
		expect(exeInputMatch?.[0]).toContain('checked');
	});
});

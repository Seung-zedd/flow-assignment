import { defineConfig, devices } from '@playwright/test';

// 배포된 프로덕션을 기본 대상으로 삼는다. 로컬/프리뷰를 겨냥할 때만 PLAYWRIGHT_BASE_URL을 덮어쓴다.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://flow-assignment-opal.vercel.app';

export default defineConfig({
	testDir: 'e2e',
	globalSetup: './e2e/global-setup.ts',
	globalTeardown: './e2e/global-teardown.ts',
	// 프로덕션의 공유 상태(정책 테이블)를 건드리므로 병렬 실행을 금지한다.
	// 두 테스트가 동시에 exe 토글을 반대로 돌리면 서로의 전제를 무너뜨린다.
	fullyParallel: false,
	workers: 1,
	retries: 1,
	// Neon 콜드 스타트(수 초)를 흡수할 수 있도록 넉넉히 잡는다.
	timeout: 90_000,
	expect: { timeout: 15_000 },
	reporter: 'line',
	outputDir: 'e2e/traces',
	use: {
		baseURL,
		trace: 'on',
		screenshot: 'only-on-failure',
		actionTimeout: 30_000,
		navigationTimeout: 30_000
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});

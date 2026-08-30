import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// 업로드 요청은 최대 4MB 본문을 읽고 시그니처를 판별한 뒤 Blob에 저장한다.
			// plan.md §14의 레퍼런스 패턴(maxDuration: 60)을 업로드 경로 실측치에 맞춰 30초로 낮춘다.
			adapter: adapter({ maxDuration: 30 })
		})
	],
	test: {
		expect: { requireAssertions: true },
		// PGlite(WASM)를 쓰는 테스트 파일이 여러 개 동시에 뜰 때 기본 10초 훅 타임아웃을
		// 넘기는 경우가 있어 넉넉히 늘린다(정책 검증 로직 자체가 느린 것은 아니다).
		hookTimeout: 30000,
		coverage: {
			provider: 'v8',
			// acceptance.md Q2 / spec.md §6과 동일한 glob — 커버리지 측정 분모의 단일 원본
			include: ['src/lib/server/**'],
			reporter: ['text', 'json-summary']
		},
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'node',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/lib/components/**/*.{test,spec}.{js,ts}']
				}
			},
			{
				extends: './vite.config.ts',
				// Svelte 5 클라이언트 컴포넌트를 jsdom에서 렌더링하려면 'browser' 조건이 필요하다
				// (없으면 서버 렌더링 경로로 해석되어 lifecycle_function_unavailable 오류가 난다).
				// resolve는 Vite 최상위 옵션이라 test 블록이 아니라 프로젝트 객체의 형제로 둔다.
				resolve: { conditions: ['browser'] },
				test: {
					name: 'jsdom',
					environment: 'jsdom',
					include: ['src/lib/components/**/*.{test,spec}.{js,ts}']
				}
			}
		]
	}
});

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
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
			// M2에서 jsdom 프로젝트를 추가한다 (plan.md §8 — AC-016a 컴포넌트 테스트 전용).
		]
	}
});

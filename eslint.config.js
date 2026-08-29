// ESLint 10 플랫 설정 (SvelteKit + TypeScript + Prettier).
// 주의: eslint-plugin-svelte 3.x 의 configs.* 와 typescript-eslint 의 configs.* 는 배열이다.
// ESLint 10 은 배열 안의 배열을 자동으로 펴 주지 않으므로(“Unexpected array”) 반드시 스프레드한다.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
	{
		// 빌드 산출물·의존성·커버리지 리포트는 검사하지 않는다.
		ignores: ['.svelte-kit/**', 'build/**', '.vercel/**', 'coverage/**', 'node_modules/**']
	},
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			// TypeScript 가 미정의 식별자를 잡으므로 no-undef 는 중복 오탐만 낸다.
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	}
);

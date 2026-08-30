import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import FixedExtensionList from './FixedExtensionList.svelte';

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

const SEED_FIXED = [
	{ extension: 'bat', blocked: false },
	{ extension: 'cmd', blocked: false },
	{ extension: 'com', blocked: false },
	{ extension: 'cpl', blocked: false },
	{ extension: 'exe', blocked: false },
	{ extension: 'scr', blocked: false },
	{ extension: 'js', blocked: false }
];

describe('FixedExtensionList', () => {
	test('AC-UPLOAD-016a: 체크 시 낙관적으로 즉시 체크되고, 실패 응답 후 unCheck로 롤백되며 오류가 표시된다', async () => {
		let resolveFetch!: (value: Response) => void;
		const pending = new Promise<Response>((resolve) => {
			resolveFetch = resolve;
		});
		vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending));

		const { getByRole, getByText } = render(FixedExtensionList, {
			props: { fixed: SEED_FIXED.map((row) => ({ ...row })) }
		});

		const exeCheckbox = getByRole('checkbox', { name: /exe/ }) as HTMLInputElement;
		expect(exeCheckbox.checked).toBe(false);

		await fireEvent.click(exeCheckbox);
		await tick();

		// 낙관적 갱신 — 응답이 오기 전에 이미 체크 상태다.
		expect(exeCheckbox.checked).toBe(true);

		resolveFetch(
			new Response(
				JSON.stringify({
					ok: false,
					error: { code: 'INTERNAL', message: '서버 오류가 발생했어요.' }
				}),
				{ status: 500 }
			)
		);

		// fetch → response.json() → 상태 롤백까지 여러 마이크로태스크를 거치므로 폴링 대기한다.
		await vi.waitFor(() => {
			expect(exeCheckbox.checked).toBe(false);
		});
		expect(getByText('서버 오류가 발생했어요.')).toBeTruthy();
	});

	test('성공 응답이면 서버가 반환한 정식 상태로 재조정된다', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						ok: true,
						fixed: SEED_FIXED.map((row) =>
							row.extension === 'exe' ? { ...row, blocked: true } : row
						)
					}),
					{ status: 200 }
				)
			)
		);

		const { getByRole } = render(FixedExtensionList, {
			props: { fixed: SEED_FIXED.map((row) => ({ ...row })) }
		});

		const exeCheckbox = getByRole('checkbox', { name: /exe/ }) as HTMLInputElement;
		await fireEvent.click(exeCheckbox);
		await tick();
		await tick();

		expect(exeCheckbox.checked).toBe(true);
	});
});

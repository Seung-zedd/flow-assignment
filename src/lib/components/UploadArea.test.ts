import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import UploadArea from './UploadArea.svelte';

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

const DISCLAIMER = '이 확인은 편의용이에요. 실제 차단은 서버에서 이뤄집니다.';
const CLIENT_HINT_BLOCKED = '이 확장자는 지금 차단 목록에 있어요. 올리면 서버에서 거부돼요.';

function baseProps(overrides: Record<string, unknown> = {}) {
	return {
		blockedExtensions: ['exe'],
		extensionAliases: { jpeg: 'jpg' },
		clientHintBlocked: CLIENT_HINT_BLOCKED,
		disclaimer: DISCLAIMER,
		...overrides
	};
}

function makeFile(name: string, content = 'x', type = 'text/plain'): File {
	return new File([content], name, { type });
}

function fileInput(getByLabelText: (text: RegExp) => HTMLElement): HTMLInputElement {
	return getByLabelText(/파일/) as HTMLInputElement;
}

describe('UploadArea', () => {
	test('안내 문구(CLIENT_HINT_DISCLAIMER)는 항상 렌더링된다', () => {
		const { getByText } = render(UploadArea, { props: baseProps() });
		expect(getByText(DISCLAIMER)).toBeTruthy();
	});

	test('차단 확장자를 선택하면 비차단 힌트가 표시되고, 업로드 버튼은 전송을 막지 않는다', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(
					new Response(JSON.stringify({ ok: true, originalName: 'setup.exe' }), { status: 200 })
				)
		);
		const { getByLabelText, getByText, getByRole } = render(UploadArea, { props: baseProps() });
		const input = fileInput(getByLabelText);

		await fireEvent.change(input, { target: { files: [makeFile('setup.exe')] } });
		await tick();

		expect(getByText(CLIENT_HINT_BLOCKED)).toBeTruthy();

		const uploadButton = getByRole('button', { name: /업로드/ });
		await fireEvent.click(uploadButton);

		await vi.waitFor(() => {
			expect(fetch).toHaveBeenCalledTimes(1);
		});
	});

	test('415 응답이면 서버가 내려준 오류 메시지를 그대로 렌더링한다', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						ok: false,
						error: { code: 'BLOCKED_EXTENSION', message: '차단된 확장자예요: exe' }
					}),
					{ status: 415 }
				)
			)
		);
		const { getByLabelText, getByRole, getByText } = render(UploadArea, { props: baseProps() });
		const input = fileInput(getByLabelText);
		await fireEvent.change(input, { target: { files: [makeFile('setup.exe')] } });
		await tick();
		await fireEvent.click(getByRole('button', { name: /업로드/ }));

		await vi.waitFor(() => {
			expect(getByText('차단된 확장자예요: exe')).toBeTruthy();
		});
	});

	test('파일 2개 선택 시 첫 요청이 끝난 뒤에야 두번째 요청이 시작된다(순차 전송)', async () => {
		let resolveFirst!: (value: Response) => void;
		const firstPending = new Promise<Response>((resolve) => {
			resolveFirst = resolve;
		});
		const fetchMock = vi
			.fn()
			.mockImplementationOnce(() => firstPending)
			.mockImplementationOnce(() =>
				Promise.resolve(
					new Response(JSON.stringify({ ok: true, originalName: 'b.txt' }), { status: 200 })
				)
			);
		vi.stubGlobal('fetch', fetchMock);

		const { getByLabelText, getByRole } = render(UploadArea, {
			props: baseProps({ blockedExtensions: [] })
		});
		const input = fileInput(getByLabelText);
		await fireEvent.change(input, {
			target: { files: [makeFile('a.txt'), makeFile('b.txt')] }
		});
		await tick();
		await fireEvent.click(getByRole('button', { name: /업로드/ }));
		await tick();

		// 첫 요청이 아직 끝나지 않았으므로 두번째 요청은 시작되지 않는다.
		expect(fetchMock).toHaveBeenCalledTimes(1);

		resolveFirst(
			new Response(JSON.stringify({ ok: true, originalName: 'a.txt' }), { status: 200 })
		);

		await vi.waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(2);
		});
	});
});

import { test, expect, type Page } from '@playwright/test';
import { restoreToBaseline } from './policy-api';

// 배포된 프로덕션을 대상으로 도는 스모크. 공유 상태를 바꾸는 여정은 반드시 스스로 되돌리고,
// afterEach가 스냅샷 기준으로 한 번 더 되돌린다(이중 방어).
test.describe.configure({ mode: 'serial' });

const CUSTOM_TEST_EXT = 'zzq';

function customInput(page: Page) {
	return page.locator('.custom-extension-input input[type="text"]');
}

function addButton(page: Page) {
	return page.getByRole('button', { name: '추가', exact: true });
}

function counter(page: Page) {
	return page.locator('.custom-extension-input .counter');
}

function fixedCheckbox(page: Page, extension: string) {
	return page.locator('.fixed-extension-list li').filter({ hasText: extension }).getByRole('checkbox');
}

test.afterEach(async () => {
	const actions = await restoreToBaseline();
	if (actions.length > 0) {
		console.log(`[afterEach] restored drift: ${actions.join(', ')}`);
	}
});

test('페이지 로드 — 제목·고정 확장자 체크박스·면책 문구가 보인다', async ({ page }) => {
	await page.goto('/');

	await expect(page.getByRole('heading', { name: '확장자 차단 정책', level: 1 })).toBeVisible();

	for (const extension of ['bat', 'cmd', 'com', 'cpl', 'exe', 'scr', 'js']) {
		await expect(fixedCheckbox(page, extension)).toBeVisible();
	}

	await expect(page.locator('#upload-disclaimer')).toHaveText(
		'이 확인은 편의용이에요. 실제 차단은 서버에서 이뤄집니다.'
	);
});

test('정책 왕복 — exe 토글이 새로고침 후에도 유지되고 원래대로 되돌아간다', async ({ page }) => {
	await page.goto('/');

	const checkbox = fixedCheckbox(page, 'exe');
	const before = await checkbox.isChecked();

	await Promise.all([
		page.waitForResponse(
			(response) =>
				response.url().includes('/api/policy/fixed/exe') && response.request().method() === 'PATCH'
		),
		checkbox.click()
	]);
	await expect(checkbox).toBeChecked({ checked: !before });

	await page.reload();
	await expect(fixedCheckbox(page, 'exe')).toBeChecked({ checked: !before });

	// 원상복구
	await Promise.all([
		page.waitForResponse(
			(response) =>
				response.url().includes('/api/policy/fixed/exe') && response.request().method() === 'PATCH'
		),
		fixedCheckbox(page, 'exe').click()
	]);
	await page.reload();
	await expect(fixedCheckbox(page, 'exe')).toBeChecked({ checked: before });
});

test('커스텀 확장자 — 추가 시 칩·카운터가 늘고 삭제 시 되돌아온다', async ({ page }) => {
	await page.goto('/');

	const startCount = Number((await counter(page).innerText()).split('/')[0]);

	await customInput(page).fill(CUSTOM_TEST_EXT);
	await Promise.all([
		page.waitForResponse(
			(response) =>
				response.url().includes('/api/policy/custom') && response.request().method() === 'POST'
		),
		addButton(page).click()
	]);

	await expect(page.locator('.chip-list li.chip').filter({ hasText: CUSTOM_TEST_EXT })).toBeVisible();
	await expect(counter(page)).toHaveText(`${startCount + 1}/200`);

	await Promise.all([
		page.waitForResponse(
			(response) =>
				response.url().includes(`/api/policy/custom/${CUSTOM_TEST_EXT}`) &&
				response.request().method() === 'DELETE'
		),
		page.getByRole('button', { name: `${CUSTOM_TEST_EXT} 삭제` }).click()
	]);

	await expect(
		page.locator('.chip-list li.chip').filter({ hasText: CUSTOM_TEST_EXT })
	).toHaveCount(0);
	await expect(counter(page)).toHaveText(`${startCount}/200`);
});

test('업로드 성공 — 차단되지 않은 .txt 파일이 통과한다', async ({ page }) => {
	await page.goto('/');

	const name = `e2e-smoke-${Date.now()}.txt`;
	await page.locator('input[type="file"]').setInputFiles({
		name,
		mimeType: 'text/plain',
		buffer: Buffer.from('flow-assignment e2e smoke: plain text payload\n', 'utf8')
	});

	await page.getByRole('button', { name: '업로드', exact: true }).click();

	const row = page.locator('.result-list li').filter({ hasText: name });
	await expect(row.locator('span[role="status"]')).toHaveText('업로드 성공');
});

test('업로드 차단 — exe가 차단된 상태에서 setup.exe가 거부된다', async ({ page }) => {
	await page.goto('/');

	const checkbox = fixedCheckbox(page, 'exe');
	const before = await checkbox.isChecked();
	if (!before) {
		await Promise.all([
			page.waitForResponse(
				(response) =>
					response.url().includes('/api/policy/fixed/exe') &&
					response.request().method() === 'PATCH'
			),
			checkbox.click()
		]);
	}

	// blockedExtensions는 SSR load가 내려주므로 토글 후 다시 그려야 클라이언트 힌트도 최신이 된다.
	await page.reload();

	await page.locator('input[type="file"]').setInputFiles({
		name: 'setup.exe',
		mimeType: 'application/octet-stream',
		buffer: Buffer.from('not a real executable', 'utf8')
	});
	await page.getByRole('button', { name: '업로드', exact: true }).click();

	const row = page.locator('.result-list li').filter({ hasText: 'setup.exe' });
	await expect(row.locator('span[role="alert"]')).toHaveText('차단된 확장자예요: exe');

	// 원상복구 (afterEach가 한 번 더 확인한다)
	if (!before) {
		await Promise.all([
			page.waitForResponse(
				(response) =>
					response.url().includes('/api/policy/fixed/exe') &&
					response.request().method() === 'PATCH'
			),
			fixedCheckbox(page, 'exe').click()
		]);
	}
});

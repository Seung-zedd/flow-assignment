import { test, expect, type Page } from '@playwright/test';
import { restoreToBaseline, setFixed } from './policy-api';

// Q12 게이트 증거 수집: 사유 코드 10종 + 알림 3종을 배포 URL에서 실제로 유발해
// 화면 문구가 reason-codes.ts(= plan.md §4.1 문구 상수 표)와 정확히 일치하는지 단언하고,
// 코드별 스크린샷을 e2e/screenshots/q12/<CODE>.png 로 남긴다.
// 문구가 어긋나면 테스트가 실패한다 — 그 실패 자체가 Q12가 잡아야 할 결함이다.
test.describe.configure({ mode: 'serial' });

const SHOT_DIR = 'e2e/screenshots/q12';

function customInput(page: Page) {
	return page.locator('.custom-extension-input input[type="text"]');
}

function addButton(page: Page) {
	return page.getByRole('button', { name: '추가', exact: true });
}

function inputError(page: Page) {
	return page.locator('.custom-extension-input .error[role="alert"]');
}

function inputNotice(page: Page) {
	return page.locator('.custom-extension-input .notice[role="status"]');
}

function uploadAlert(page: Page, fileName: string) {
	return page
		.locator('.result-list li')
		.filter({ hasText: fileName })
		.locator('span[role="alert"]');
}

async function addCustomViaUi(page: Page, value: string) {
	await customInput(page).fill(value);
	await addButton(page).click();
}

async function uploadFile(page: Page, name: string, buffer: Buffer, mimeType = 'text/plain') {
	await page.locator('input[type="file"]').setInputFiles({ name, mimeType, buffer });
	await page.getByRole('button', { name: '업로드', exact: true }).click();
}

test.afterEach(async () => {
	const actions = await restoreToBaseline();
	if (actions.length > 0) {
		console.log(`[afterEach] restored drift: ${actions.join(', ')}`);
	}
});

test('EXT_EMPTY — 빈 입력으로 추가', async ({ page }) => {
	await page.goto('/');
	await addButton(page).click();
	await expect(inputError(page)).toHaveText('확장자를 입력해 주세요.');
	await page.screenshot({ path: `${SHOT_DIR}/EXT_EMPTY.png` });
});

test('EXT_TOO_LONG — 21자 입력', async ({ page }) => {
	await page.goto('/');
	await addCustomViaUi(page, 'a'.repeat(21));
	await expect(inputError(page)).toHaveText('확장자는 최대 20자까지 입력할 수 있어요.');
	await page.screenshot({ path: `${SHOT_DIR}/EXT_TOO_LONG.png` });
});

test('EXT_INVALID_CHARS — 점 포함 입력', async ({ page }) => {
	await page.goto('/');
	await addCustomViaUi(page, 'a.b');
	await expect(inputError(page)).toHaveText('확장자는 영문 소문자와 숫자만 사용할 수 있어요.');
	await page.screenshot({ path: `${SHOT_DIR}/EXT_INVALID_CHARS.png` });
});

test('EXT_DUPLICATE — 같은 확장자 재추가', async ({ page }) => {
	await page.goto('/');
	await addCustomViaUi(page, 'zzq');
	await expect(page.locator('.chip-list li.chip').filter({ hasText: 'zzq' })).toBeVisible();
	await addCustomViaUi(page, 'zzq');
	await expect(inputError(page)).toHaveText('이미 추가된 확장자예요.');
	await page.screenshot({ path: `${SHOT_DIR}/EXT_DUPLICATE.png` });
	// zzq 원복은 afterEach의 restoreToBaseline이 수행한다.
});

test('EXT_IS_FIXED — 고정 확장자를 커스텀으로 추가', async ({ page }) => {
	await page.goto('/');
	await addCustomViaUi(page, 'exe');
	await expect(inputError(page)).toHaveText('고정 확장자예요. 위 체크박스에서 관리해 주세요.');
	await page.screenshot({ path: `${SHOT_DIR}/EXT_IS_FIXED.png` });
});

// 커스텀 확장자를 200개까지 채워야 유발되는 코드. 프로덕션 DB에 200행을 쓰는 비용 대비
// 얻는 증거가 작아 스킵하고, sync 단계 게이트 표에 수동 확인 항목으로 남긴다.
test.skip('EXT_LIMIT_REACHED — 200개 한도 (프로덕션 부하로 스킵)', () => {});

test('ALIAS_FOLDED — 별칭(jpeg) 추가 시 대표형(jpg) 접힘 알림', async ({ page }) => {
	await page.goto('/');
	await addCustomViaUi(page, 'jpeg');
	await expect(inputNotice(page)).toHaveText('jpeg는 jpg와 같은 형식이라 jpg로 저장돼요.');
	await expect(page.locator('.chip-list li.chip').filter({ hasText: 'jpg' })).toBeVisible();
	await page.screenshot({ path: `${SHOT_DIR}/ALIAS_FOLDED.png` });
	// 저장된 것은 jpg 행이며, afterEach가 기준 스냅샷과의 차이로 지운다.
});

test('BLOCKED_EXTENSION — 차단 확장자 업로드', async ({ page }) => {
	await setFixed('exe', true);
	await page.goto('/');
	await uploadFile(
		page,
		'setup.exe',
		Buffer.from('not a real executable'),
		'application/octet-stream'
	);
	await expect(uploadAlert(page, 'setup.exe')).toHaveText('차단된 확장자예요: exe');
	await page.screenshot({ path: `${SHOT_DIR}/BLOCKED_EXTENSION.png` });
});

test('SIGNATURE_BLOCKED — 허용 확장자 뒤에 숨은 실행 파일 내용', async ({ page }) => {
	await setFixed('exe', true);
	await page.goto('/');
	// MZ 매직 넘버로 시작하는 내용 → 시그니처 판정이 exe로 감지한다.
	const mzPayload = Buffer.concat([Buffer.from([0x4d, 0x5a]), Buffer.from('fake executable body')]);
	await uploadFile(page, 'innocent.txt', mzPayload, 'text/plain');
	await expect(uploadAlert(page, 'innocent.txt')).toHaveText(
		'파일 내용이 차단 대상 형식(exe)이에요.'
	);
	await page.screenshot({ path: `${SHOT_DIR}/SIGNATURE_BLOCKED.png` });
});

test('NO_EXTENSION — 확장자 없는 파일', async ({ page }) => {
	await page.goto('/');
	await uploadFile(page, 'README', Buffer.from('no extension here'));
	await expect(uploadAlert(page, 'README')).toHaveText(
		'확장자가 없어 차단 정책을 적용할 수 없어요.'
	);
	await page.screenshot({ path: `${SHOT_DIR}/NO_EXTENSION.png` });
});

test('FILE_TOO_LARGE — 4MB 초과 업로드', async ({ page }) => {
	await page.goto('/');
	const oversize = Buffer.alloc(4 * 1024 * 1024 + 1, 0x61);
	await uploadFile(page, 'big.txt', oversize);
	await expect(uploadAlert(page, 'big.txt')).toHaveText('파일은 4MB까지 올릴 수 있어요.');
	await page.screenshot({ path: `${SHOT_DIR}/FILE_TOO_LARGE.png` });
});

test('CLIENT_HINT_BLOCKED — 차단 확장자 선택 시 업로드 전 힌트', async ({ page }) => {
	await setFixed('exe', true);
	await page.goto('/');
	// 업로드 버튼을 누르지 않고 파일 선택만으로 클라이언트 힌트가 떠야 한다.
	await page.locator('input[type="file"]').setInputFiles({
		name: 'setup.exe',
		mimeType: 'application/octet-stream',
		buffer: Buffer.from('unused')
	});
	await expect(page.locator('.hint[role="status"]')).toHaveText(
		'이 확장자는 지금 차단 목록에 있어요. 올리면 서버에서 거부돼요.'
	);
	await page.screenshot({ path: `${SHOT_DIR}/CLIENT_HINT_BLOCKED.png` });
});

test('CLIENT_HINT_DISCLAIMER — 페이지 로드 시 면책 문구', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('#upload-disclaimer')).toHaveText(
		'이 확인은 편의용이에요. 실제 차단은 서버에서 이뤄집니다.'
	);
	await page.screenshot({ path: `${SHOT_DIR}/CLIENT_HINT_DISCLAIMER.png` });
});

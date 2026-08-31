// 정책 API를 직접 호출하는 얇은 헬퍼. 테스트 본문은 UI만 조작하고,
// 이 모듈은 "테스트 전 상태 스냅샷 / 테스트 후 원상복구"에만 쓴다.
// 프로덕션에 쓰기를 남기지 않는 것이 목적이므로 UI 경로와 분리해 둔다.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export interface FixedRow {
	extension: string;
	blocked: boolean;
}

export interface CustomRow {
	extension: string;
}

export interface Policy {
	fixed: FixedRow[];
	custom: CustomRow[];
	customCount: number;
}

export const BASELINE_PATH = path.join('e2e', '.runs', 'policy-baseline.json');

export function baseURL(): string {
	return process.env.PLAYWRIGHT_BASE_URL ?? 'https://flow-assignment-opal.vercel.app';
}

export async function getPolicy(): Promise<Policy> {
	const response = await fetch(`${baseURL()}/api/policy`);
	if (!response.ok) {
		throw new Error(`GET /api/policy failed: ${response.status}`);
	}
	return (await response.json()) as Policy;
}

export async function setFixed(extension: string, blocked: boolean): Promise<void> {
	const response = await fetch(`${baseURL()}/api/policy/fixed/${extension}`, {
		method: 'PATCH',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ blocked })
	});
	if (!response.ok) {
		throw new Error(`PATCH /api/policy/fixed/${extension} failed: ${response.status}`);
	}
}

export async function addCustom(extension: string): Promise<void> {
	await fetch(`${baseURL()}/api/policy/custom`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ extension })
	});
}

export async function deleteCustom(extension: string): Promise<void> {
	await fetch(`${baseURL()}/api/policy/custom/${extension}`, { method: 'DELETE' });
}

export async function saveBaseline(policy: Policy): Promise<void> {
	await mkdir(path.dirname(BASELINE_PATH), { recursive: true });
	await writeFile(BASELINE_PATH, JSON.stringify(policy, null, 2), 'utf8');
}

export async function loadBaseline(): Promise<Policy> {
	return JSON.parse(await readFile(BASELINE_PATH, 'utf8')) as Policy;
}

// 기준 상태와 현재 상태의 차이만 되돌린다. 차이가 없으면 쓰기 요청을 한 건도 보내지 않는다.
export async function restoreToBaseline(): Promise<string[]> {
	const baseline = await loadBaseline();
	const current = await getPolicy();
	const actions: string[] = [];

	for (const row of baseline.fixed) {
		const now = current.fixed.find((candidate) => candidate.extension === row.extension);
		if (now && now.blocked !== row.blocked) {
			await setFixed(row.extension, row.blocked);
			actions.push(`fixed:${row.extension}=${row.blocked}`);
		}
	}

	const baselineCustom = new Set(baseline.custom.map((row) => row.extension));
	for (const row of current.custom) {
		if (!baselineCustom.has(row.extension)) {
			await deleteCustom(row.extension);
			actions.push(`custom:-${row.extension}`);
		}
	}

	const currentCustom = new Set(current.custom.map((row) => row.extension));
	for (const extension of baselineCustom) {
		if (!currentCustom.has(extension)) {
			await addCustom(extension);
			actions.push(`custom:+${extension}`);
		}
	}

	return actions;
}

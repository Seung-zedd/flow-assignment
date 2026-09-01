// 실행 전 대상 환경 정책의 스냅샷을 남긴다. 이 파일이 원상복구(global-teardown)의 기준이다.
import { getPolicy, saveBaseline, baseURL } from './policy-api';

export default async function globalSetup(): Promise<void> {
	const policy = await getPolicy();
	await saveBaseline(policy);
	console.log(
		`[global-setup] ${baseURL()} baseline: fixed=${policy.fixed
			.map((row) => `${row.extension}:${row.blocked}`)
			.join(',')} custom=[${policy.custom.map((row) => row.extension).join(',')}] count=${
			policy.customCount
		}`
	);
}

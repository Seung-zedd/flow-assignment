// 실행 후 정책을 스냅샷 상태로 되돌린다. 테스트가 중간에 실패해도 이 훅은 돌기 때문에
// "테스트가 프로덕션에 흔적을 남기지 않는다"는 계약의 마지막 방어선이다.
import { getPolicy, restoreToBaseline } from './policy-api';

export default async function globalTeardown(): Promise<void> {
	const actions = await restoreToBaseline();
	const after = await getPolicy();
	console.log(
		`[global-teardown] restored: ${actions.length === 0 ? '(no drift)' : actions.join(', ')}`
	);
	console.log(
		`[global-teardown] final: fixed=${after.fixed
			.map((row) => `${row.extension}:${row.blocked}`)
			.join(',')} custom=[${after.custom.map((row) => row.extension).join(',')}] count=${
			after.customCount
		}`
	);
}

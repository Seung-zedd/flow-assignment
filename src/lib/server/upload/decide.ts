import { MAX_UPLOAD_BYTES } from '$lib/constants';
import type { DetectedType } from './signature';

export interface DecideUploadInput {
	segments: readonly string[];
	blockedSet: ReadonlySet<string>;
	// sniffSignature()가 돌려주는 것과 같은 모양을 재사용한다(signature.ts가 단일 원본).
	detected: DetectedType;
	sizeBytes: number;
}

export type DecideUploadResult =
	| { ok: true; mismatch: boolean; detectedMime?: string }
	| { ok: false; code: 'FILE_TOO_LARGE'; http: 413 }
	| { ok: false; code: 'NO_EXTENSION'; http: 415 }
	| { ok: false; code: 'BLOCKED_EXTENSION'; http: 415; details: { matched: string } }
	| { ok: false; code: 'SIGNATURE_BLOCKED'; http: 415; details: { detected: string } };

// @MX:ANCHOR: [AUTO] 업로드 판정의 단일 진입점이자 공개 API 경계 — 이 함수를 실제로
// 호출하는 곳은 업로드 엔드포인트(api/upload/+server.ts) 하나와 decide.test.ts뿐이다.
// 클라이언트 힌트는 SvelteKit 서버 경계 때문에 이 함수를 호출하지 못하고 별도의 경량
// 함수(UploadArea.svelte의 isClientHintBlocked)로 대조한다(progress.md §Deviations 2).
// @MX:REASON: 판정 로직이 갈라지면 서버·클라이언트 힌트·테스트 사이에 조용한 불일치가
// 생긴다(plan.md §13 MX 태그 계획).
export function decideUpload(input: DecideUploadInput): DecideUploadResult {
	const { segments, blockedSet, detected, sizeBytes } = input;

	// 1) 크기 상한 — REQ-UPLOAD-012.
	if (sizeBytes > MAX_UPLOAD_BYTES) {
		return { ok: false, code: 'FILE_TOO_LARGE', http: 413 };
	}

	// 2) 확장자 후보 부재 — 차단 목록이 비어 있어도 계속 강제된다(REQ-UPLOAD-013).
	if (segments.length === 0) {
		return { ok: false, code: 'NO_EXTENSION', http: 415 };
	}

	// 3) 정책 대조 — 파일명 순서상 먼저 걸린 세그먼트를 matched로 보고한다(REQ-UPLOAD-008).
	const matched = segments.find((segment) => blockedSet.has(segment));
	if (matched) {
		return { ok: false, code: 'BLOCKED_EXTENSION', http: 415, details: { matched } };
	}

	// 4) 시그니처 대조 — 탐지된 확장자가 차단 목록에 있을 때만 거부한다(REQ-UPLOAD-009).
	if (detected.detectedExt && blockedSet.has(detected.detectedExt)) {
		return {
			ok: false,
			code: 'SIGNATURE_BLOCKED',
			http: 415,
			details: { detected: detected.detectedExt }
		};
	}

	// 5) 성공 — 탐지 결과가 선언 확장자(마지막 세그먼트)와 다르면 mismatch로만 기록한다.
	// 단순 불일치는 거부 사유가 아니다(REQ-UPLOAD-010).
	const declaredExtension = segments.at(-1);
	const mismatch = Boolean(detected.detectedExt) && detected.detectedExt !== declaredExtension;

	return { ok: true, mismatch, detectedMime: detected.detectedMime };
}

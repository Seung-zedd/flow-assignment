import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	extractExtensionSegments,
	normalizeFilename,
	truncateUtf8
} from '$lib/server/upload/extension';
import { sniffSignature } from '$lib/server/upload/signature';
import { decideUpload } from '$lib/server/upload/decide';
import { errorResponse } from '$lib/server/upload/http';
import { getPolicy } from '$lib/server/db/policy-repo';
import { recordUploadAttempt, type UploadAttemptRow } from '$lib/server/db/upload-repo';
import type { Db } from '$lib/server/db/client';
import { MAX_UPLOAD_BYTES, SNIFF_BYTES } from '$lib/constants';

// upload_attempt.original_name(255바이트)과는 별개로, 구조화 로그의 파일명은 64자로
// 절단한다(REQ-UPLOAD-014). 사용자 제어 문자열을 로그에 그대로 남기지 않기 위함이다.
const MAX_LOGGED_NAME_BYTES = 64;

interface LogAttemptFields {
	outcome: 'accepted' | 'rejected';
	reasonCode: string | null;
	ext: string | null;
	sizeBytes: number | null;
	declaredMime: string | null;
	detectedMime: string | null;
	originalName: string | null;
	requestId: string;
}

// 파일 단위 판정마다 구조화 로그 1줄을 남긴다. 파일 내용은 절대 기록하지 않는다
// (REQ-UPLOAD-014, plan.md §7).
function logAttempt(fields: LogAttemptFields): void {
	console.log(
		JSON.stringify({
			event: 'upload_attempt',
			ts: new Date().toISOString(),
			request_id: fields.requestId,
			outcome: fields.outcome,
			reason_code: fields.reasonCode,
			ext: fields.ext,
			size_bytes: fields.sizeBytes,
			declared_mime: fields.declaredMime,
			detected_mime: fields.detectedMime,
			original_name: fields.originalName
				? truncateUtf8(fields.originalName, MAX_LOGGED_NAME_BYTES)
				: null
		})
	);
}

// upload_attempt 1행과 구조화 로그 1줄은 같은 판정의 두 표현이다. 행을 단일 원본으로
// 두고 로그를 그 투영으로 파생시킨다 — 두 곳에 필드를 따로 적으면 한쪽만 고쳐지는
// 순간 DB와 로그가 조용히 어긋난다. blob_pathname만 로그에 남기지 않는다(저장 키는
// 판정 근거가 아니다).
async function recordAndLogAttempt(
	db: Db,
	row: UploadAttemptRow,
	requestId: string
): Promise<void> {
	await recordUploadAttempt(db, row);
	logAttempt({
		outcome: row.outcome,
		reasonCode: row.reasonCode,
		ext: row.extension,
		sizeBytes: row.sizeBytes,
		declaredMime: row.declaredMime,
		detectedMime: row.detectedMime,
		originalName: row.originalName,
		requestId
	});
}

// @MX:ANCHOR: [AUTO] 요청당 파일 1개를 받는 유일한 업로드 진입점. decideUpload()의
// 판정 결과를 upload_attempt 기록·Blob 저장·구조화 로그로 이어 붙인다(plan.md §3).
// @MX:REASON: 이 함수가 곧 서버 사이드 강제의 유일한 지점이다 — 클라이언트 힌트는
// 여기를 우회하지 못한다(REQ-UPLOAD-016 "서버는 유일한 강제 지점이다").
export const POST: RequestHandler = async ({ request, locals }) => {
	const requestId = request.headers.get('x-vercel-id') ?? crypto.randomUUID();

	// 1) 크기 선차단(헤더) — 본문을 소비하기 전에 거부한다. 이 시점에는 파일명·실제
	// 크기가 확정되지 않아 upload_attempt에 행을 남길 수 없다(NOT NULL 컬럼).
	// 요청 단위 거부는 구조화 로그만 남긴다(REQ-UPLOAD-014).
	const contentLength = request.headers.get('content-length');
	if (contentLength && Number(contentLength) > MAX_UPLOAD_BYTES) {
		logAttempt({
			outcome: 'rejected',
			reasonCode: 'FILE_TOO_LARGE',
			ext: null,
			sizeBytes: Number(contentLength),
			declaredMime: null,
			detectedMime: null,
			originalName: null,
			requestId
		});
		return errorResponse('FILE_TOO_LARGE');
	}

	const formData = await request.formData();
	const file = formData.get('file');
	if (!(file instanceof File)) {
		throw error(400, '업로드할 파일이 없어요.');
	}

	// 2) 크기 재확인(실측) — Content-Length 헤더가 없거나 허위로 신고된 경우를 위한
	// 두 번째 겹이다(REQ-UPLOAD-012). 파일명이 확정되므로 이 경로의 거부는
	// upload_attempt에 1행을 남긴다(파일 단위 판정).
	const normalizedName = normalizeFilename(file.name);
	const declaredMime = file.type || null;

	if (file.size > MAX_UPLOAD_BYTES) {
		await recordAndLogAttempt(
			locals.db,
			{
				originalName: normalizedName,
				extension: null,
				declaredMime,
				detectedMime: null,
				sizeBytes: file.size,
				outcome: 'rejected',
				reasonCode: 'FILE_TOO_LARGE',
				blobPathname: null
			},
			requestId
		);
		return errorResponse('FILE_TOO_LARGE');
	}

	const segments = extractExtensionSegments(normalizedName);
	const lastSegment = segments.at(-1) ?? null;

	const policy = await getPolicy(locals.db);
	const blockedSet = new Set<string>([
		...policy.fixed.filter((row) => row.blocked).map((row) => row.extension),
		...policy.custom.map((row) => row.extension)
	]);

	const sample = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
	const detected = await sniffSignature(sample);

	const decision = decideUpload({ segments, blockedSet, detected, sizeBytes: file.size });

	if (!decision.ok) {
		const details = 'details' in decision ? decision.details : undefined;

		await recordAndLogAttempt(
			locals.db,
			{
				originalName: normalizedName,
				extension: lastSegment,
				declaredMime,
				detectedMime: detected.detectedMime ?? null,
				sizeBytes: file.size,
				outcome: 'rejected',
				reasonCode: decision.code,
				blobPathname: null
			},
			requestId
		);
		return errorResponse(decision.code, details);
	}

	// 3) 저장 — 원본 파일명을 절대 저장 키로 쓰지 않는다. 키에 확장자를 포함하지 않아
	// 경로 기반 Content-Type 추론을 차단한다(REQ-UPLOAD-011). 순서는 put → INSERT로
	// 고정한다(plan.md §7) — 반대 순서면 blob_pathname을 미리 확정할 수 없다.
	const pathname = `uploads/${crypto.randomUUID()}`;
	await locals.blob.put(pathname, file, 'application/octet-stream');

	try {
		await recordAndLogAttempt(
			locals.db,
			{
				originalName: normalizedName,
				extension: lastSegment,
				declaredMime,
				detectedMime: decision.detectedMime ?? null,
				sizeBytes: file.size,
				outcome: 'accepted',
				reasonCode: null,
				blobPathname: pathname
			},
			requestId
		);
	} catch (err) {
		// Blob put은 성공했는데 DB 기록이 실패하면 고아 객체가 생긴다. 보상 삭제는 그
		// 삭제도 실패할 수 있어 문제를 미룰 뿐이므로 이벤트를 로그로 남기는 것으로
		// 대신한다(plan.md §7 잔여 위험, 매트릭스 E8).
		console.log(JSON.stringify({ event: 'orphan_blob', blob_pathname: pathname }));
		throw err;
	}

	return json({
		ok: true,
		originalName: normalizedName,
		mismatch: decision.mismatch,
		...(decision.detectedMime ? { detectedMime: decision.detectedMime } : {})
	});
};

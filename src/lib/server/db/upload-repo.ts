import type { Db } from './client';

export interface UploadAttemptRow {
	originalName: string;
	extension: string | null;
	declaredMime: string | null;
	detectedMime: string | null;
	sizeBytes: number;
	outcome: 'accepted' | 'rejected';
	reasonCode: string | null;
	blobPathname: string | null;
}

// 파일 단위 판정(수락·거부)마다 정확히 1행을 남긴다(REQ-UPLOAD-014). 본문을 읽기 전에
// 확정되는 요청 단위 거부(Content-Length 선차단)는 이 함수를 호출하지 않는다 — 그
// 시점에는 파일명·실제 크기가 없어 NOT NULL 컬럼을 채울 수 없다.
export async function recordUploadAttempt(db: Db, row: UploadAttemptRow): Promise<void> {
	await db.query(
		`INSERT INTO upload_attempt
			(original_name, extension, declared_mime, detected_mime, size_bytes, outcome, reason_code, blob_pathname)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		[
			row.originalName,
			row.extension,
			row.declaredMime,
			row.detectedMime,
			row.sizeBytes,
			row.outcome,
			row.reasonCode,
			row.blobPathname
		]
	);
}

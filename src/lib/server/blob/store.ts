import { put } from '@vercel/blob';
import { env } from '$env/dynamic/private';

// db/client.ts의 Db와 같은 패턴 — 실제 저장소를 인터페이스 뒤로 숨겨 테스트에서는
// 가짜 구현으로 교체한다(네트워크 왕복 없이 판정 로직만 검증).
export interface BlobStore {
	put(
		pathname: string,
		body: Blob | Uint8Array,
		contentType: string
	): Promise<{ pathname: string }>;
}

export function createVercelBlobStore(token: string): BlobStore {
	return {
		async put(pathname, body, contentType) {
			// @vercel/blob의 PutBody는 Uint8Array를 직접 받지 않는다(Blob | Readable |
			// Buffer | ReadableStream | File). Buffer는 Uint8Array의 상위 타입이므로
			// 값은 그대로 두고 타입만 좁힌다 — 런타임 바이트는 바뀌지 않는다.
			const payload = body instanceof Uint8Array ? Buffer.from(body) : body;
			const result = await put(pathname, payload, {
				access: 'private',
				token,
				contentType,
				addRandomSuffix: false
			});
			return { pathname: result.pathname };
		}
	};
}

let cached: BlobStore | undefined;

// Neon getDb()와 같은 지연 생성 패턴 — BLOB_READ_WRITE_TOKEN이 없는 환경(테스트)에서는
// 이 함수를 호출하지 않으므로 실제 네트워크 경로는 검증 대상에서 제외된다.
export function getBlobStore(): BlobStore {
	if (!cached) {
		const token = env.BLOB_READ_WRITE_TOKEN;
		if (!token) {
			throw new Error('BLOB_READ_WRITE_TOKEN이 설정되지 않았습니다.');
		}
		cached = createVercelBlobStore(token);
	}
	return cached;
}

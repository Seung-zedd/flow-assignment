<script lang="ts">
	interface UploadAreaProps {
		blockedExtensions: string[];
		extensionAliases: Record<string, string>;
		clientHintBlocked: string;
		disclaimer: string;
	}

	let { blockedExtensions, extensionAliases, clientHintBlocked, disclaimer }: UploadAreaProps =
		$props();

	interface SelectedFile {
		file: File;
		blocked: boolean;
	}

	interface UploadResult {
		name: string;
		status: 'success' | 'error';
		message?: string;
		mismatch?: boolean;
		detectedMime?: string;
	}

	let selected = $state<SelectedFile[]>([]);
	let results = $state<UploadResult[]>([]);
	let uploading = $state(false);

	interface UploadApiResponse {
		ok: boolean;
		originalName?: string;
		mismatch?: boolean;
		detectedMime?: string;
		error?: { message: string };
	}

	// @MX:WARN: [AUTO] UX 힌트 전용 — 신뢰 경계 아님. 이미 페이지에 로드된 정책으로
	// 확장자를 조회할 뿐이며 어떤 판정에도 입력으로 쓰이지 않는다. 힌트를 무시하고
	// 전송된 요청도 서버에서 동일하게 판정된다(REQ-UPLOAD-016).
	// @MX:REASON: 서버 전용 판정 모듈은 SvelteKit 경계상 클라이언트 컴포넌트에서
	// 임포트할 수 없어 decideUpload()를 재사용하지 못한다 — 서버가 유일한 강제
	// 지점이라는 계약이 이 함수의 존재 이유이자 한계다.
	function isClientHintBlocked(filename: string): boolean {
		const segments = filename
			.toLowerCase()
			.split('.')
			.slice(1)
			.filter((segment) => segment.length > 0)
			.map((segment) => extensionAliases[segment] ?? segment);
		return segments.some((segment) => blockedExtensions.includes(segment));
	}

	function onFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = input.files ? Array.from(input.files) : [];
		selected = files.map((file) => ({ file, blocked: isClientHintBlocked(file.name) }));
		results = [];
	}

	// 요청 하나 = 파일 하나(plan.md §5) — 다중 선택은 파일 개수만큼 순차 요청으로
	// 처리한다. 서버 응답을 기다린 뒤에야 다음 파일을 보낸다.
	async function uploadAll() {
		if (uploading || selected.length === 0) return;
		uploading = true;
		const next: UploadResult[] = [];

		for (const { file } of selected) {
			const formData = new FormData();
			formData.append('file', file);
			try {
				const response = await fetch('/api/upload', { method: 'POST', body: formData });
				const body = (await response.json()) as UploadApiResponse;
				if (!response.ok || !body.ok) {
					next.push({
						name: file.name,
						status: 'error',
						message: body.error?.message ?? '업로드에 실패했어요.'
					});
				} else {
					next.push({
						name: file.name,
						status: 'success',
						mismatch: body.mismatch,
						detectedMime: body.detectedMime
					});
				}
			} catch {
				next.push({
					name: file.name,
					status: 'error',
					message: '네트워크 오류로 업로드하지 못했어요.'
				});
			}
			results = [...next];
		}

		uploading = false;
	}
</script>

<div class="upload-area">
	<p class="disclaimer">{disclaimer}</p>

	<label>
		업로드할 파일
		<input type="file" multiple onchange={onFileChange} disabled={uploading} />
	</label>

	{#if selected.length > 0}
		<ul class="selected-list">
			{#each selected as item (item.file.name)}
				<li>
					{item.file.name}
					{#if item.blocked}
						<span class="hint" role="status">{clientHintBlocked}</span>
					{/if}
				</li>
			{/each}
		</ul>
		<button type="button" onclick={uploadAll} disabled={uploading}>업로드</button>
	{/if}

	{#if results.length > 0}
		<ul class="result-list">
			{#each results as result (result.name)}
				<li>
					{result.name}:
					{#if result.status === 'success'}
						<span role="status">업로드 성공</span>
						{#if result.mismatch}
							<span class="badge" role="status">내용 형식: {result.detectedMime}</span>
						{/if}
					{:else}
						<span role="alert">{result.message}</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.hint {
		color: #b8860b;
	}

	.badge {
		color: #555;
	}
</style>

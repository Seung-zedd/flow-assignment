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
	<p class="disclaimer" id="upload-disclaimer">{disclaimer}</p>

	<!-- 힌트가 편의용이라는 단서를 파일 입력 자체에 붙인다 — 화면에만 떠 있으면
	     스크린리더 사용자가 입력에 초점을 둔 순간에는 그 단서를 듣지 못한다. -->
	<label>
		업로드할 파일
		<input
			type="file"
			multiple
			onchange={onFileChange}
			disabled={uploading}
			aria-describedby="upload-disclaimer"
		/>
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
		<button type="button" onclick={uploadAll} disabled={uploading} aria-busy={uploading}>
			업로드
		</button>
	{/if}

	{#if results.length > 0}
		<ul class="result-list">
			{#each results as result (result.name)}
				<li class={result.status}>
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
	.disclaimer {
		color: var(--color-muted-fg);
		font-size: 0.875rem;
		margin: 0 0 14px;
	}

	.upload-area > label {
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-weight: 500;
	}

	input[type='file'] {
		width: 100%;
		padding: 18px;
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-bg);
		cursor: pointer;
		transition: border-color 150ms;
	}

	input[type='file']:hover {
		border-color: var(--color-primary);
	}

	input[type='file']::file-selector-button {
		margin-right: 12px;
		padding: 8px 14px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-card);
		font: inherit;
		font-weight: 500;
		cursor: pointer;
		transition:
			border-color 150ms,
			color 150ms;
	}

	input[type='file']:hover::file-selector-button {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.selected-list {
		list-style: none;
		display: grid;
		gap: 6px;
		padding: 0;
		margin: 14px 0;
	}

	.upload-area > button {
		padding: 10px 20px;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--color-primary);
		color: #fff;
		font-weight: 600;
		transition: background-color 150ms;
	}

	.upload-area > button:hover {
		background: var(--color-primary-hover);
	}

	.upload-area > button:disabled {
		opacity: 0.6;
		cursor: progress;
	}

	.result-list {
		list-style: none;
		display: grid;
		gap: 8px;
		padding: 0;
		margin: 16px 0 0;
	}

	.result-list li {
		padding: 10px 14px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-bg);
		font-size: 0.95rem;
	}

	/* 성공/실패는 색만이 아니라 왼쪽 굵은 선으로도 구분한다(색약 대응). */
	.result-list li.success {
		border-left: 3px solid var(--color-success);
	}

	.result-list li.error {
		border-left: 3px solid var(--color-destructive);
	}

	.result-list li.success > span[role='status']:not(.badge) {
		color: var(--color-success);
		font-weight: 500;
	}

	.result-list li.error span[role='alert'] {
		color: var(--color-destructive);
		font-weight: 500;
	}

	.hint {
		color: var(--color-warn);
		font-size: 0.875rem;
	}

	.badge {
		display: inline-block;
		margin-left: 6px;
		padding: 2px 10px;
		border-radius: 999px;
		background: var(--color-border);
		color: var(--color-muted-fg);
		font-size: 0.8rem;
	}
</style>

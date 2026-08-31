<script lang="ts">
	import { untrack } from 'svelte';

	interface CustomExtensionRow {
		extension: string;
	}

	let {
		custom,
		customCount,
		max = 200
	}: { custom: CustomExtensionRow[]; customCount: number; max?: number } = $props();

	// untrack — custom/customCount는 "초기값"으로만 읽는다. $derived로 두면 서버 값이 바뀔 때마다
	// 낙관적 갱신·롤백 중인 로컬 목록을 덮어쓰므로 의도적으로 한 번만 읽고, 그 의도를
	// 컴파일러에게도 명시한다(그렇지 않으면 state_referenced_locally 경고).
	let items = $state(untrack(() => custom.map((row) => ({ ...row }))));
	let count = $state(untrack(() => customCount));
	let inputValue = $state('');
	let errorMessage = $state<string | null>(null);
	let noticeMessage = $state<string | null>(null);
	let pending = $state(false);

	interface CustomApiResponse {
		ok: boolean;
		custom?: CustomExtensionRow[];
		customCount?: number;
		notice?: { message: string };
		error?: { message: string };
	}

	async function addExtension() {
		if (pending) return;
		const value = inputValue;
		errorMessage = null;
		noticeMessage = null;
		pending = true;

		try {
			const response = await fetch('/api/policy/custom', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ extension: value })
			});
			const body = (await response.json()) as CustomApiResponse;

			if (!response.ok || !body.ok) {
				errorMessage = body.error?.message ?? '확장자를 추가하지 못했어요.';
				return;
			}

			items = body.custom ?? [];
			count = body.customCount ?? items.length;
			inputValue = '';
			if (body.notice) {
				noticeMessage = body.notice.message;
			}
		} catch {
			errorMessage = '네트워크 오류로 확장자를 추가하지 못했어요.';
		} finally {
			pending = false;
		}
	}

	async function removeExtension(extension: string) {
		const previousItems = items;
		const previousCount = count;
		items = items.filter((row) => row.extension !== extension);
		count = items.length;
		errorMessage = null;

		try {
			const response = await fetch(`/api/policy/custom/${extension}`, { method: 'DELETE' });
			const body = (await response.json()) as CustomApiResponse;

			if (!response.ok || !body.ok) {
				items = previousItems;
				count = previousCount;
				errorMessage = body.error?.message ?? '확장자를 삭제하지 못했어요.';
				return;
			}

			items = body.custom ?? [];
			count = body.customCount ?? items.length;
		} catch {
			items = previousItems;
			count = previousCount;
			errorMessage = '네트워크 오류로 확장자를 삭제하지 못했어요.';
		}
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			addExtension();
		}
	}
</script>

<div class="custom-extension-input">
	<div class="input-row">
		<label>
			커스텀 확장자
			<input type="text" bind:value={inputValue} onkeydown={onKeydown} disabled={pending} />
		</label>
		<button type="button" onclick={addExtension} disabled={pending}>추가</button>
		<span class="counter" aria-label="커스텀 확장자 {count}개, 최대 {max}개">{count}/{max}</span>
	</div>

	<ul class="chip-list">
		{#each items as row (row.extension)}
			<li class="chip">
				{row.extension}
				<button
					type="button"
					aria-label={`${row.extension} 삭제`}
					onclick={() => removeExtension(row.extension)}
				>
					×
				</button>
			</li>
		{/each}
	</ul>

	{#if noticeMessage}
		<p class="notice" role="status">{noticeMessage}</p>
	{/if}
	{#if errorMessage}
		<p class="error" role="alert">{errorMessage}</p>
	{/if}
</div>

<style>
	.input-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
	}

	.input-row label {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		font-weight: 500;
	}

	input[type='text'] {
		min-width: 240px;
		padding: 9px 12px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-card);
		transition: border-color 150ms;
	}

	input[type='text']:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgb(37 99 235 / 0.15);
	}

	.input-row > button {
		padding: 9px 16px;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--color-primary);
		color: #fff;
		font-weight: 600;
		transition: background-color 150ms;
	}

	.input-row > button:hover {
		background: var(--color-primary-hover);
	}

	.input-row > button:disabled {
		opacity: 0.6;
		cursor: progress;
	}

	.counter {
		color: var(--color-muted-fg);
		font-size: 0.9rem;
		font-variant-numeric: tabular-nums;
	}

	.chip-list {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 0;
		margin: 14px 0 0;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 6px 5px 12px;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: var(--color-bg);
		font-size: 0.9rem;
		font-weight: 500;
	}

	.chip button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border: none;
		border-radius: 999px;
		background: transparent;
		color: var(--color-muted-fg);
		line-height: 1;
		transition:
			background-color 150ms,
			color 150ms;
	}

	.chip button:hover {
		background: var(--color-destructive-soft);
		color: var(--color-destructive);
	}

	.error {
		color: var(--color-destructive);
		font-size: 0.875rem;
		margin: 12px 0 0;
	}

	.notice {
		color: var(--color-muted-fg);
		font-size: 0.875rem;
		margin: 12px 0 0;
	}
</style>

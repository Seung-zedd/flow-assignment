<script lang="ts">
	import { untrack } from 'svelte';

	interface FixedExtensionRow {
		extension: string;
		blocked: boolean;
	}

	let { fixed }: { fixed: FixedExtensionRow[] } = $props();

	// 서버가 내려준 초기값의 복사본을 지역 상태로 들고, 낙관적 갱신·롤백·서버 재조정을
	// 모두 이 상태 하나로 표현한다(REQ-UPLOAD-016).
	// untrack — fixed는 "초기값"으로만 읽는다. $derived로 두면 서버 값이 바뀔 때마다 낙관적
	// 갱신 중인 로컬 상태를 덮어써 AC-016a의 롤백 계약이 깨진다. 이 한 번만 읽겠다는 의도를
	// 컴파일러에게도 명시한다(그렇지 않으면 state_referenced_locally 경고).
	let rows = $state(untrack(() => fixed.map((row) => ({ ...row }))));
	let errorMessage = $state<string | null>(null);
	let pendingExtension = $state<string | null>(null);

	async function toggle(extension: string) {
		const target = rows.find((row) => row.extension === extension);
		if (!target) return;

		const previous = target.blocked;
		target.blocked = !previous; // 낙관적 갱신
		errorMessage = null;
		pendingExtension = extension;

		try {
			const response = await fetch(`/api/policy/fixed/${extension}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ blocked: target.blocked })
			});
			const body = (await response.json()) as {
				ok: boolean;
				fixed?: FixedExtensionRow[];
				error?: { message: string };
			};

			if (!response.ok || !body.ok) {
				target.blocked = previous; // 롤백
				errorMessage = body.error?.message ?? '정책 변경에 실패했어요.';
				return;
			}

			// 서버가 반환한 정식 상태로 재조정한다(REQ-UPLOAD-002).
			for (const row of body.fixed ?? []) {
				const local = rows.find((r) => r.extension === row.extension);
				if (local) {
					local.blocked = row.blocked;
				}
			}
		} catch {
			target.blocked = previous;
			errorMessage = '네트워크 오류로 정책을 변경하지 못했어요.';
		} finally {
			pendingExtension = null;
		}
	}
</script>

<ul class="fixed-extension-list">
	{#each rows as row (row.extension)}
		<li>
			<label>
				<input
					type="checkbox"
					checked={row.blocked}
					disabled={pendingExtension === row.extension}
					onchange={() => toggle(row.extension)}
				/>
				{row.extension}
			</label>
		</li>
	{/each}
</ul>

{#if errorMessage}
	<p class="error" role="alert">{errorMessage}</p>
{/if}

<style>
	.fixed-extension-list {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 0;
		margin: 0;
	}

	label {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 40px;
		padding: 6px 14px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-card);
		font-weight: 500;
		cursor: pointer;
		user-select: none;
		transition:
			border-color 150ms,
			background-color 150ms;
	}

	label:hover {
		border-color: var(--color-primary);
	}

	/* 체크된 토글은 배경·테두리로도 구분한다 — 체크박스 하나에만 의존하지 않기. */
	label:has(input:checked) {
		background: var(--color-primary-soft);
		border-color: var(--color-primary);
	}

	label:has(input:disabled) {
		opacity: 0.6;
		cursor: progress;
	}

	input[type='checkbox'] {
		width: 16px;
		height: 16px;
		margin: 0;
		accent-color: var(--color-primary);
	}

	.error {
		color: var(--color-destructive);
		font-size: 0.875rem;
		margin: 12px 0 0;
	}
</style>

<script lang="ts">
	interface FixedExtensionRow {
		extension: string;
		blocked: boolean;
	}

	let { fixed }: { fixed: FixedExtensionRow[] } = $props();

	// 서버가 내려준 초기값의 복사본을 지역 상태로 들고, 낙관적 갱신·롤백·서버 재조정을
	// 모두 이 상태 하나로 표현한다(REQ-UPLOAD-016).
	let rows = $state(fixed.map((row) => ({ ...row })));
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
		gap: 0.75rem;
		padding: 0;
		margin: 0;
	}

	.error {
		color: #b00020;
	}
</style>

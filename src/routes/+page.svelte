<script lang="ts">
	import type { PageData } from './$types';
	import FixedExtensionList from '$lib/components/FixedExtensionList.svelte';
	import CustomExtensionInput from '$lib/components/CustomExtensionInput.svelte';
	import UploadArea from '$lib/components/UploadArea.svelte';

	let { data }: { data: PageData } = $props();
</script>

<h1>확장자 차단 정책</h1>

<section>
	<h2>고정 확장자</h2>
	<FixedExtensionList fixed={data.policy.fixed} />
</section>

<section>
	<h2>커스텀 확장자</h2>
	<CustomExtensionInput custom={data.policy.custom} customCount={data.policy.customCount} />
</section>

<section>
	<h2>업로드</h2>
	<UploadArea
		blockedExtensions={data.blockedExtensions}
		extensionAliases={data.extensionAliases}
		clientHintBlocked={data.clientHintBlocked}
		disclaimer={data.clientHintDisclaimer}
	/>
</section>

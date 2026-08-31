<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<main class="page">
	{@render children()}
</main>

<style>
	.page {
		max-width: 760px;
		margin: 0 auto;
		padding: 40px 20px 80px;
	}
</style>

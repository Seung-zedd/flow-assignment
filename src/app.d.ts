// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Db } from '$lib/server/db/client';
import type { BlobStore } from '$lib/server/blob/store';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			db: Db;
			blob: BlobStore;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

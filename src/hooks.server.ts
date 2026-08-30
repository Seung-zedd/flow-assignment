import type { Handle } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/client';
import { getBlobStore } from '$lib/server/blob/store';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.db = getDb();
	event.locals.blob = getBlobStore();
	return resolve(event);
};

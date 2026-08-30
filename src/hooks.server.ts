import type { Handle } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/client';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.db = getDb();
	return resolve(event);
};

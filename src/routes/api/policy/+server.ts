import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPolicy } from '$lib/server/db/policy-repo';

export const GET: RequestHandler = async ({ locals }) => {
	const policy = await getPolicy(locals.db);
	return json(policy);
};

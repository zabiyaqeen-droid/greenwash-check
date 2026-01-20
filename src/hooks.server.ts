import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	return response;
};

// Configure body size limit for the Node adapter
// This is picked up by the adapter-node
export const config = {
	api: {
		bodyParser: {
			sizeLimit: '30mb'
		}
	}
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// In-memory storage for users (in production, use a database)
// This will be populated by the register endpoint
declare global {
  var registeredUsers: any[];
}

if (!globalThis.registeredUsers) {
  globalThis.registeredUsers = [];
}

export const GET: RequestHandler = async ({ request }) => {
  // In a real app, you'd verify the admin token/session here
  // For now, we return all registered users
  
  try {
    return json(globalThis.registeredUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return json({ error: 'Failed to fetch users' }, { status: 500 });
  }
};

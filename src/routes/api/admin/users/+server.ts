import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllUsers } from '$lib/supabase';

export const GET: RequestHandler = async ({ request }) => {
  // In a real app, you'd verify the admin token/session here
  
  try {
    const users = await getAllUsers();
    
    // Transform to match the expected format in the admin page
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      company: user.company,
      jobTitle: user.job_title,
      linkedin: user.linkedin,
      registeredAt: user.registered_at,
      lastLoginAt: user.last_login_at,
      loginCount: user.login_count
    }));
    
    return json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return json({ error: 'Failed to fetch users' }, { status: 500 });
  }
};

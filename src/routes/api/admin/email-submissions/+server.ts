import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllEmailSubmissions, deleteEmailSubmission, isAdminEmail } from '$lib/supabase';

export const GET: RequestHandler = async ({ request }) => {
  try {
    // Get admin email from header (set by client after login)
    const adminEmail = request.headers.get('x-admin-email');
    
    if (!adminEmail || !isAdminEmail(adminEmail)) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const submissions = await getAllEmailSubmissions();
    return json({ submissions });
  } catch (error) {
    console.error('Error fetching email submissions:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request }) => {
  try {
    // Get admin email from header
    const adminEmail = request.headers.get('x-admin-email');
    
    if (!adminEmail || !isAdminEmail(adminEmail)) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return json({ error: 'Submission ID is required' }, { status: 400 });
    }

    const success = await deleteEmailSubmission(id);
    
    if (!success) {
      return json({ error: 'Failed to delete submission' }, { status: 500 });
    }

    return json({ success: true });
  } catch (error) {
    console.error('Error deleting email submission:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

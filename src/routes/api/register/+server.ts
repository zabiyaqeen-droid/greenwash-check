import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { upsertUser } from '$lib/supabase';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { name, email, company, jobTitle, linkedIn } = await request.json();

    if (!name || !email || !company) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    
    // Save user to Supabase
    const user = await upsertUser({
      email: email.toLowerCase(),
      name,
      company,
      job_title: jobTitle || undefined,
      linkedin: linkedIn || undefined
    });

    if (!user) {
      // Log to console as fallback
      console.log(`=== USER REGISTRATION (DB FAILED) ===`);
      console.log(`Timestamp: ${timestamp}`);
      console.log(`Name: ${name}`);
      console.log(`Email: ${email}`);
      console.log(`Company: ${company}`);
      console.log(`Job Title: ${jobTitle || 'N/A'}`);
      console.log(`LinkedIn: ${linkedIn || 'N/A'}`);
      console.log(`=========================`);
      
      // Still return success - we don't want to block registration
      return json({ success: true, warning: 'User saved to logs only' });
    }

    // Log registration to console
    console.log(`=== USER REGISTRATION ===`);
    console.log(`Timestamp: ${timestamp}`);
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Company: ${company}`);
    console.log(`Job Title: ${jobTitle || 'N/A'}`);
    console.log(`LinkedIn: ${linkedIn || 'N/A'}`);
    console.log(`User ID: ${user.id}`);
    console.log(`=========================`);

    return json({ success: true, userId: user.id });
  } catch (error) {
    console.error('Registration error:', error);
    return json({ error: 'Registration failed' }, { status: 500 });
  }
};

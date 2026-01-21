import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { upsertUser, trackUserLogin } from '$lib/supabase';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { name, email, company, isNewUser, jobTitle, linkedIn } = await request.json();

    const now = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });

    const event = isNewUser ? 'NEW_SIGNUP' : 'RETURNING_LOGIN';

    if (isNewUser) {
      // For new users, upsert to database
      await upsertUser({
        email: email.toLowerCase(),
        name,
        company,
        job_title: jobTitle,
        linkedin: linkedIn
      });
    } else {
      // For returning users, just track the login
      await trackUserLogin(email);
    }

    console.log(`=== USER LOGIN TRACKED ===`);
    console.log(`Event: ${event}`);
    console.log(`User: ${name} (${email})`);
    console.log(`Company: ${company}`);
    console.log(`Timestamp: ${now}`);
    console.log(`==========================`);

    return json({ success: true });
  } catch (error) {
    console.error('Track login error:', error);
    // Don't fail the login if tracking fails
    return json({ success: true, warning: 'Login tracking failed' });
  }
};

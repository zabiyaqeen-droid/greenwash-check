import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { saveEmailSubmission } from '$lib/supabase';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, documentName, assessmentScore, riskLevel } = body;

    if (!email) {
      return json({ error: 'Email is required' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Get client info from headers
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Save to database
    const id = await saveEmailSubmission({
      email,
      document_name: documentName,
      assessment_score: assessmentScore,
      risk_level: riskLevel,
      ip_address: ipAddress,
      user_agent: userAgent
    });

    if (!id) {
      return json({ error: 'Failed to save email submission' }, { status: 500 });
    }

    return json({ success: true, id });
  } catch (error) {
    console.error('Error saving email submission:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

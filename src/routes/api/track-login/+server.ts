import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { name, email, company, isNewUser } = await request.json();

    const csvPath = 'static/registrations.csv';
    const dir = dirname(csvPath);
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    if (!existsSync(csvPath)) {
      appendFileSync(csvPath, 'Timestamp,Name,Email,Company,JobTitle,LinkedIn,Event\n');
    }

    const timestamp = new Date().toISOString();
    const event = isNewUser ? 'NEW_SIGNUP' : 'RETURNING_LOGIN';
    const csvLine = `"${timestamp}","${name}","${email}","${company}","","","${event}"\n`;
    appendFileSync(csvPath, csvLine);

    const now = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });

    console.log(`=== USER LOGIN TRACKED ===`);
    console.log(`Event: ${event}`);
    console.log(`User: ${name} (${email})`);
    console.log(`Company: ${company}`);
    console.log(`Timestamp: ${now}`);
    console.log(`==========================`);

    return json({ success: true });
  } catch (error) {
    console.error('Track login error:', error);
    return json({ error: 'Failed to track login' }, { status: 500 });
  }
};

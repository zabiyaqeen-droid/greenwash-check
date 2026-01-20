import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// In-memory storage for users (shared with admin endpoint)
declare global {
  var registeredUsers: any[];
}

if (!globalThis.registeredUsers) {
  globalThis.registeredUsers = [];
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { name, email, company, jobTitle, linkedIn } = await request.json();

    if (!name || !email || !company) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    
    // Store user in global array
    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      company,
      jobTitle: jobTitle || null,
      linkedin: linkedIn || null,
      registeredAt: timestamp
    };
    
    // Check if user already exists
    const existingIndex = globalThis.registeredUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingIndex >= 0) {
      // Update existing user
      globalThis.registeredUsers[existingIndex] = { ...globalThis.registeredUsers[existingIndex], ...newUser, registeredAt: globalThis.registeredUsers[existingIndex].registeredAt };
    } else {
      // Add new user
      globalThis.registeredUsers.push(newUser);
    }

    // Log registration to console (Vercel logs)
    console.log(`=== USER REGISTRATION ===`);
    console.log(`Timestamp: ${timestamp}`);
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Company: ${company}`);
    console.log(`Job Title: ${jobTitle || 'N/A'}`);
    console.log(`LinkedIn: ${linkedIn || 'N/A'}`);
    console.log(`Total Users: ${globalThis.registeredUsers.length}`);
    console.log(`=========================`);

    return json({ success: true });
  } catch (error) {
    console.error('Registration error:', error);
    return json({ error: 'Registration failed' }, { status: 500 });
  }
};

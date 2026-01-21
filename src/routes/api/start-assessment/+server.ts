import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAssessmentJob, getAssessmentJob } from '$lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface StartAssessmentRequest {
  userId: string;
  documentId?: string;
  documentName?: string;
  filePath?: string;
  inputType: 'document' | 'text';
  inputText?: string;
  analysisMode: 'hybrid' | 'vision';
  emailAddress?: string;
}

// POST /api/start-assessment - Create a new assessment job and start processing
export const POST: RequestHandler = async ({ request, fetch }) => {
  try {
    const body: StartAssessmentRequest = await request.json();
    
    // Validate required fields
    if (!body.userId) {
      return json({ error: 'Missing userId' }, { status: 400 });
    }
    
    if (body.inputType === 'document' && !body.documentId) {
      return json({ error: 'Missing documentId for document input' }, { status: 400 });
    }
    
    if (body.inputType === 'text' && !body.inputText) {
      return json({ error: 'Missing inputText for text input' }, { status: 400 });
    }
    
    // Generate a document ID if not provided
    const documentId = body.documentId || uuidv4();
    
    // Create the job in the database
    const jobId = await createAssessmentJob({
      userId: body.userId,
      documentId: documentId,
      documentName: body.documentName || (body.inputType === 'text' ? 'Text Input' : 'Document'),
      filePath: body.filePath,
      inputType: body.inputType,
      inputText: body.inputText,
      analysisMode: body.analysisMode || 'hybrid',
      emailAddress: body.emailAddress
    });
    
    if (!jobId) {
      return json({ error: 'Failed to create assessment job' }, { status: 500 });
    }
    
    // Start processing the job asynchronously
    // We use fetch to call our own API endpoint to start the processing
    // This allows the request to return immediately while processing continues
    fetch('/api/process-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId })
    }).catch(err => {
      console.error('Error triggering job processing:', err);
    });
    
    // Return the job ID immediately
    return json({
      success: true,
      jobId: jobId,
      message: 'Assessment started. You can navigate away and check back later.'
    });
    
  } catch (error) {
    console.error('Error starting assessment:', error);
    return json({ error: 'Failed to start assessment' }, { status: 500 });
  }
};

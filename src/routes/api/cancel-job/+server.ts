import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAssessmentJob, failAssessmentJob } from '$lib/supabase';

// POST /api/cancel-job - Cancel a running assessment job
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { jobId, userId } = await request.json();
    
    if (!jobId) {
      return json({ error: 'Missing jobId' }, { status: 400 });
    }
    
    const job = await getAssessmentJob(jobId);
    
    if (!job) {
      return json({ error: 'Job not found' }, { status: 404 });
    }
    
    // Verify the user owns this job
    if (userId && job.user_id !== userId) {
      return json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Can only cancel pending or processing jobs
    if (job.status !== 'pending' && job.status !== 'processing') {
      return json({ 
        error: 'Cannot cancel job', 
        message: `Job is already ${job.status}`,
        status: job.status 
      }, { status: 400 });
    }
    
    // Mark the job as failed with cancellation message
    await failAssessmentJob(jobId, 'Cancelled by user');
    
    return json({ 
      success: true, 
      message: 'Job cancelled successfully' 
    });
    
  } catch (error) {
    console.error('Error cancelling job:', error);
    return json({ error: 'Failed to cancel job' }, { status: 500 });
  }
};

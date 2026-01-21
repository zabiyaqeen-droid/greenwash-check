import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAssessmentJob, getUserActiveJobs } from '$lib/supabase';

// GET /api/job-status?jobId=xxx or GET /api/job-status?userId=xxx
export const GET: RequestHandler = async ({ url }) => {
  const jobId = url.searchParams.get('jobId');
  const userId = url.searchParams.get('userId');
  
  try {
    if (jobId) {
      // Get specific job status
      const job = await getAssessmentJob(jobId);
      
      if (!job) {
        return json({ error: 'Job not found' }, { status: 404 });
      }
      
      return json({
        id: job.id,
        status: job.status,
        progress: job.progress,
        currentStep: job.current_step,
        documentName: job.document_name,
        result: job.result,
        error: job.error,
        createdAt: job.created_at,
        completedAt: job.completed_at
      });
    } else if (userId) {
      // Get all active jobs for user
      const jobs = await getUserActiveJobs(userId);
      
      return json(jobs.map(job => ({
        id: job.id,
        status: job.status,
        progress: job.progress,
        currentStep: job.current_step,
        documentName: job.document_name,
        createdAt: job.created_at
      })));
    } else {
      return json({ error: 'Missing jobId or userId parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching job status:', error);
    return json({ error: 'Failed to fetch job status' }, { status: 500 });
  }
};

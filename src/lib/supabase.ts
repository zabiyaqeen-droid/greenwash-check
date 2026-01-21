import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

// Lazy initialization to avoid build-time errors
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
let _supabaseClient: ReturnType<typeof createClient> | null = null;

// Server-side client with full access (uses service_role key)
export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      env.SUPABASE_URL || '',
      env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }
  return _supabaseAdmin;
}

// Client-side safe client (uses anon key)
export function getSupabaseClient() {
  if (!_supabaseClient) {
    _supabaseClient = createClient(
      env.SUPABASE_URL || '',
      env.SUPABASE_ANON_KEY || ''
    );
  }
  return _supabaseClient;
}

// Types for our database tables
export interface DocumentChunk {
  id?: string;
  document_id: string;
  user_id: string;
  chunk_index: number;
  content: string;
  page_number?: number;
  embedding?: number[];
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface AssessmentPrompt {
  id?: string;
  principle_id: number;
  principle_name: string;
  subcategory_id: string;
  subcategory_name: string;
  prompt_template: string;
  weight: number;
  is_default?: boolean;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AssessmentResult {
  id?: string;
  user_id: string;
  document_id: string;
  document_name: string;
  overall_score: number;
  risk_level: string;
  principle_scores: Record<string, any>;
  findings: Record<string, any>[];
  recommendations: string[];
  created_at?: string;
}

// Helper functions for database operations

// Get all assessment prompts (default or user-customized)
export async function getAssessmentPrompts(userId?: string): Promise<AssessmentPrompt[]> {
  let query = getSupabaseAdmin()
    .from('assessment_prompts')
    .select('*')
    .order('principle_id', { ascending: true });
  
  if (userId) {
    // Get user-specific prompts if they exist, otherwise get defaults
    query = query.or(`user_id.eq.${userId},user_id.is.null`);
  } else {
    query = query.is('user_id', null);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching prompts:', error);
    return [];
  }
  
  // If user has custom prompts, prefer those over defaults
  if (userId && data) {
    const promptMap = new Map<string, AssessmentPrompt>();
    data.forEach(prompt => {
      const key = prompt.subcategory_id;
      if (!promptMap.has(key) || prompt.user_id === userId) {
        promptMap.set(key, prompt);
      }
    });
    return Array.from(promptMap.values());
  }
  
  return data || [];
}

// Update or create a custom prompt for a user
export async function updateAssessmentPrompt(
  userId: string,
  subcategoryId: string,
  promptTemplate: string,
  weight?: number
): Promise<AssessmentPrompt | null> {
  // Check if user already has a custom prompt for this subcategory
  const { data: existing } = await getSupabaseAdmin()
    .from('assessment_prompts')
    .select('*')
    .eq('user_id', userId)
    .eq('subcategory_id', subcategoryId)
    .single();
  
  if (existing) {
    // Update existing custom prompt
    const { data, error } = await getSupabaseAdmin()
      .from('assessment_prompts')
      .update({
        prompt_template: promptTemplate,
        weight: weight ?? existing.weight,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating prompt:', error);
      return null;
    }
    return data;
  } else {
    // Get the default prompt to copy other fields
    const { data: defaultPrompt } = await getSupabaseAdmin()
      .from('assessment_prompts')
      .select('*')
      .eq('subcategory_id', subcategoryId)
      .is('user_id', null)
      .single();
    
    if (!defaultPrompt) {
      console.error('Default prompt not found for subcategory:', subcategoryId);
      return null;
    }
    
    // Create new custom prompt for user
    const { data, error } = await getSupabaseAdmin()
      .from('assessment_prompts')
      .insert({
        principle_id: defaultPrompt.principle_id,
        principle_name: defaultPrompt.principle_name,
        subcategory_id: subcategoryId,
        subcategory_name: defaultPrompt.subcategory_name,
        prompt_template: promptTemplate,
        weight: weight ?? defaultPrompt.weight,
        user_id: userId
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating custom prompt:', error);
      return null;
    }
    return data;
  }
}

// Reset a user's custom prompt to default
export async function resetPromptToDefault(
  userId: string,
  subcategoryId: string
): Promise<boolean> {
  const { error } = await getSupabaseAdmin()
    .from('assessment_prompts')
    .delete()
    .eq('user_id', userId)
    .eq('subcategory_id', subcategoryId);
  
  if (error) {
    console.error('Error resetting prompt:', error);
    return false;
  }
  return true;
}

// Store document chunks with embeddings
export async function storeDocumentChunks(
  documentId: string,
  userId: string,
  chunks: Array<{ content: string; pageNumber?: number; metadata?: Record<string, any> }>
): Promise<boolean> {
  const chunkRecords: DocumentChunk[] = chunks.map((chunk, index) => ({
    document_id: documentId,
    user_id: userId,
    chunk_index: index,
    content: chunk.content,
    page_number: chunk.pageNumber,
    metadata: chunk.metadata
  }));
  
  const { error } = await getSupabaseAdmin()
    .from('document_chunks')
    .insert(chunkRecords);
  
  if (error) {
    console.error('Error storing document chunks:', error);
    return false;
  }
  return true;
}

// Search document chunks by vector similarity
export async function searchDocumentChunks(
  documentId: string,
  queryEmbedding: number[],
  limit: number = 10,
  similarityThreshold: number = 0.7
): Promise<(DocumentChunk & { similarity: number })[]> {
  try {
    // Use the vector similarity search function
    const { data, error } = await getSupabaseAdmin()
      .rpc('match_document_chunks', {
        query_embedding: queryEmbedding,
        match_document_id: documentId,
        match_threshold: similarityThreshold,
        match_count: limit
      });
    
    if (error) {
      console.error('Vector search error:', error);
      // Fallback to getting all chunks for the document
      return fallbackGetChunks(documentId, limit);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in searchDocumentChunks:', error);
    return fallbackGetChunks(documentId, limit);
  }
}

// Fallback when vector search is not available
async function fallbackGetChunks(
  documentId: string,
  limit: number
): Promise<(DocumentChunk & { similarity: number })[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('document_chunks')
    .select('*')
    .eq('document_id', documentId)
    .order('chunk_index', { ascending: true })
    .limit(limit);
  
  if (error) {
    console.error('Fallback chunk fetch error:', error);
    return [];
  }
  
  // Add default similarity score
  return (data || []).map(chunk => ({ ...chunk, similarity: 1.0 }));
}

// Get all chunks for a document
export async function getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('document_chunks')
    .select('*')
    .eq('document_id', documentId)
    .order('chunk_index', { ascending: true });
  
  if (error) {
    console.error('Error fetching chunks:', error);
    return [];
  }
  return data || [];
}

// Save assessment result
export async function saveAssessmentResult(result: AssessmentResult): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('assessment_results')
    .insert(result)
    .select('id')
    .single();
  
  if (error) {
    console.error('Error saving assessment result:', error);
    return null;
  }
  return data?.id || null;
}

// Get user's assessment history
export async function getUserAssessmentHistory(
  userId: string,
  limit: number = 10
): Promise<AssessmentResult[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('assessment_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching assessment history:', error);
    return [];
  }
  return data || [];
}

// Delete document chunks when no longer needed
export async function deleteDocumentChunks(documentId: string): Promise<boolean> {
  const { error } = await getSupabaseAdmin()
    .from('document_chunks')
    .delete()
    .eq('document_id', documentId);
  
  if (error) {
    console.error('Error deleting chunks:', error);
    return false;
  }
  return true;
}


// ============================================
// User Management Functions
// ============================================

export interface User {
  id?: string;
  email: string;
  name: string;
  company?: string;
  job_title?: string;
  linkedin?: string;
  registered_at?: string;
  last_login_at?: string;
  login_count?: number;
  is_admin?: boolean;
  metadata?: Record<string, any>;
}

// Register or update a user
export async function upsertUser(user: Omit<User, 'id' | 'registered_at' | 'login_count'>): Promise<User | null> {
  const supabase = getSupabaseAdmin();
  
  // Check if user already exists
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('email', user.email.toLowerCase())
    .single();
  
  if (existing) {
    // Update existing user's login info
    const { data, error } = await supabase
      .from('users')
      .update({
        name: user.name || existing.name,
        company: user.company || existing.company,
        job_title: user.job_title || existing.job_title,
        linkedin: user.linkedin || existing.linkedin,
        last_login_at: new Date().toISOString(),
        login_count: (existing.login_count || 0) + 1
      })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user:', error);
      return null;
    }
    return data;
  } else {
    // Create new user
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: user.email.toLowerCase(),
        name: user.name,
        company: user.company,
        job_title: user.job_title,
        linkedin: user.linkedin,
        registered_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        login_count: 1
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      return null;
    }
    return data;
  }
}

// Get all users (for admin)
export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select('*')
    .order('registered_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return data || [];
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();
  
  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  return data;
}

// Track user login
export async function trackUserLogin(email: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  
  const { data: existing } = await supabase
    .from('users')
    .select('id, login_count')
    .eq('email', email.toLowerCase())
    .single();
  
  if (existing) {
    await supabase
      .from('users')
      .update({
        last_login_at: new Date().toISOString(),
        login_count: (existing.login_count || 0) + 1
      })
      .eq('id', existing.id);
  }
}

// ============================================
// Assessment Job Functions (for background processing)
// ============================================

export interface AssessmentJob {
  id?: string;
  user_id: string;
  document_id: string;
  document_name?: string;
  file_path?: string;
  input_type?: 'document' | 'text';
  input_text?: string;
  analysis_mode?: 'hybrid' | 'vision';
  email_address?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  current_step?: string;
  result?: Record<string, any>;
  error?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  started_at?: string;
}

export interface CreateJobParams {
  userId: string;
  documentId: string;
  documentName?: string;
  filePath?: string;
  inputType?: 'document' | 'text';
  inputText?: string;
  analysisMode?: 'hybrid' | 'vision';
  emailAddress?: string;
}

// Create a new assessment job
export async function createAssessmentJob(params: CreateJobParams): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('assessment_jobs')
    .insert({
      user_id: params.userId,
      document_id: params.documentId,
      document_name: params.documentName,
      file_path: params.filePath,
      input_type: params.inputType || 'document',
      input_text: params.inputText,
      analysis_mode: params.analysisMode || 'hybrid',
      email_address: params.emailAddress,
      status: 'pending',
      progress: 0
    })
    .select('id')
    .single();
  
  if (error) {
    console.error('Error creating assessment job:', error);
    return null;
  }
  return data?.id || null;
}

// Start processing a job (update started_at)
export async function startAssessmentJob(jobId: string): Promise<void> {
  await getSupabaseAdmin()
    .from('assessment_jobs')
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
}

// Get pending jobs that need to be processed
export async function getPendingJobs(limit: number = 10): Promise<AssessmentJob[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('assessment_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching pending jobs:', error);
    return [];
  }
  return data || [];
}

// Update assessment job progress
export async function updateAssessmentJobProgress(
  jobId: string,
  progress: number,
  currentStep?: string
): Promise<void> {
  await getSupabaseAdmin()
    .from('assessment_jobs')
    .update({
      progress,
      current_step: currentStep,
      status: 'processing',
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
}

// Complete assessment job
export async function completeAssessmentJob(
  jobId: string,
  result: Record<string, any>
): Promise<void> {
  await getSupabaseAdmin()
    .from('assessment_jobs')
    .update({
      status: 'completed',
      progress: 100,
      result,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
}

// Fail assessment job
export async function failAssessmentJob(
  jobId: string,
  error: string
): Promise<void> {
  await getSupabaseAdmin()
    .from('assessment_jobs')
    .update({
      status: 'failed',
      error,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
}

// Get assessment job by ID
export async function getAssessmentJob(jobId: string): Promise<AssessmentJob | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('assessment_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  
  if (error) {
    console.error('Error fetching assessment job:', error);
    return null;
  }
  return data;
}

// Get user's pending/processing jobs
export async function getUserActiveJobs(userId: string): Promise<AssessmentJob[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('assessment_jobs')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching active jobs:', error);
    return [];
  }
  return data || [];
}


// ============================================
// Email Submissions Functions
// ============================================

export interface EmailSubmission {
  id?: string;
  email: string;
  document_name?: string;
  assessment_score?: number;
  risk_level?: string;
  submitted_at?: string;
  ip_address?: string;
  user_agent?: string;
}

// Save an email submission
export async function saveEmailSubmission(submission: Omit<EmailSubmission, 'id' | 'submitted_at'>): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('email_submissions')
    .insert({
      ...submission,
      email: submission.email.toLowerCase(),
      submitted_at: new Date().toISOString()
    })
    .select('id')
    .single();
  
  if (error) {
    console.error('Error saving email submission:', error);
    return null;
  }
  return data?.id || null;
}

// Get all email submissions (for admin)
export async function getAllEmailSubmissions(): Promise<EmailSubmission[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('email_submissions')
    .select('*')
    .order('submitted_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching email submissions:', error);
    return [];
  }
  return data || [];
}

// Delete an email submission
export async function deleteEmailSubmission(id: string): Promise<boolean> {
  const { error } = await getSupabaseAdmin()
    .from('email_submissions')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting email submission:', error);
    return false;
  }
  return true;
}

// ============================================
// Admin Account Functions
// ============================================

// List of admin emails
const ADMIN_EMAILS = [
  'info@muuvment.com',
  'martin@muuvment.com',
  'zabi@muuvment.com'
];

// Check if an email is an admin
export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Get all admin emails
export function getAdminEmails(): string[] {
  return ADMIN_EMAILS;
}

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
  is_active: boolean;
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
    .eq('is_active', true)
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
        is_active: true,
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

// Search document chunks by content similarity (requires embeddings)
export async function searchDocumentChunks(
  documentId: string,
  query: string,
  limit: number = 10
): Promise<DocumentChunk[]> {
  // For now, do a simple text search
  // TODO: Implement vector similarity search with embeddings
  const { data, error } = await getSupabaseAdmin()
    .from('document_chunks')
    .select('*')
    .eq('document_id', documentId)
    .textSearch('content', query)
    .limit(limit);
  
  if (error) {
    console.error('Error searching chunks:', error);
    return [];
  }
  return data || [];
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

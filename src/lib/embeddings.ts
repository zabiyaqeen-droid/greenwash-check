import OpenAI from 'openai';
import { getSupabaseAdmin, type DocumentChunk } from './supabase';

// Lazy initialization of OpenAI client
let _client: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI();
  }
  return _client;
}

// Embedding model configuration
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const CHUNK_SIZE = 1000; // characters per chunk
const CHUNK_OVERLAP = 200; // overlap between chunks

/**
 * Split text into overlapping chunks for embedding
 */
export function splitTextIntoChunks(
  text: string,
  chunkSize: number = CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP
): string[] {
  const chunks: string[] = [];
  
  if (!text || text.length === 0) {
    return chunks;
  }
  
  // Split by paragraphs first to maintain semantic coherence
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) continue;
    
    // If adding this paragraph would exceed chunk size, save current and start new
    if (currentChunk.length + trimmedParagraph.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Start new chunk with overlap from previous
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + '\n\n' + trimmedParagraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
    }
  }
  
  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Generate embeddings for a batch of text chunks
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }
  
  try {
    const response = await getOpenAIClient().embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS
    });
    
    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const embeddings = await generateEmbeddings([text]);
  return embeddings[0] || [];
}

/**
 * Store document chunks with embeddings in Supabase
 */
export async function storeChunksWithEmbeddings(
  documentId: string,
  userId: string,
  chunks: Array<{
    content: string;
    pageNumber?: number;
    metadata?: Record<string, any>;
  }>
): Promise<boolean> {
  if (chunks.length === 0) {
    return true;
  }
  
  try {
    // Generate embeddings for all chunks in batches
    const batchSize = 20; // OpenAI allows up to 2048 inputs, but we batch for safety
    const allEmbeddings: number[][] = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map(c => c.content);
      const embeddings = await generateEmbeddings(texts);
      allEmbeddings.push(...embeddings);
    }
    
    // Prepare records with embeddings
    const records = chunks.map((chunk, index) => ({
      document_id: documentId,
      user_id: userId,
      chunk_index: index,
      content: chunk.content,
      page_number: chunk.pageNumber,
      embedding: `[${allEmbeddings[index].join(',')}]`, // Format for pgvector
      metadata: chunk.metadata || {}
    }));
    
    // Insert into Supabase
    const { error } = await getSupabaseAdmin()
      .from('document_chunks')
      .insert(records);
    
    if (error) {
      console.error('Error storing chunks with embeddings:', error);
      return false;
    }
    
    console.log(`Stored ${records.length} chunks with embeddings for document ${documentId}`);
    return true;
  } catch (error) {
    console.error('Error in storeChunksWithEmbeddings:', error);
    return false;
  }
}

/**
 * Search for similar chunks using vector similarity
 */
export async function searchSimilarChunks(
  documentId: string,
  queryText: string,
  limit: number = 10,
  similarityThreshold: number = 0.7
): Promise<DocumentChunk[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(queryText);
    
    // Use Supabase RPC for vector similarity search
    const { data, error } = await getSupabaseAdmin()
      .rpc('match_document_chunks', {
        query_embedding: queryEmbedding,
        match_document_id: documentId,
        match_threshold: similarityThreshold,
        match_count: limit
      });
    
    if (error) {
      console.error('Error in vector search:', error);
      // Fallback to text search
      return fallbackTextSearch(documentId, queryText, limit);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in searchSimilarChunks:', error);
    return fallbackTextSearch(documentId, queryText, limit);
  }
}

/**
 * Fallback text search when vector search fails
 */
async function fallbackTextSearch(
  documentId: string,
  query: string,
  limit: number
): Promise<DocumentChunk[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('document_chunks')
    .select('*')
    .eq('document_id', documentId)
    .textSearch('content', query)
    .limit(limit);
  
  if (error) {
    console.error('Fallback text search error:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Extract text from PDF using pdftotext
 */
export async function extractTextFromPdf(pdfPath: string): Promise<string> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  try {
    const { stdout } = await execAsync(`pdftotext -layout "${pdfPath}" -`);
    return stdout;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return '';
  }
}

/**
 * Extract text from PDF with page numbers
 */
export async function extractTextWithPages(pdfPath: string): Promise<Array<{ page: number; text: string }>> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  try {
    // Get total page count
    const { stdout: pageCountOutput } = await execAsync(`pdfinfo "${pdfPath}" | grep Pages | awk '{print $2}'`);
    const totalPages = parseInt(pageCountOutput.trim()) || 1;
    
    const pages: Array<{ page: number; text: string }> = [];
    
    // Extract text page by page
    for (let page = 1; page <= Math.min(totalPages, 200); page++) {
      try {
        const { stdout } = await execAsync(`pdftotext -f ${page} -l ${page} -layout "${pdfPath}" -`);
        if (stdout.trim()) {
          pages.push({ page, text: stdout.trim() });
        }
      } catch (pageError) {
        console.warn(`Could not extract text from page ${page}`);
      }
    }
    
    return pages;
  } catch (error) {
    console.error('Error extracting text with pages:', error);
    return [];
  }
}

/**
 * Detect if a page likely contains visual elements (charts, graphs, images)
 * based on text density and patterns
 */
export function detectVisualContent(pageText: string): boolean {
  // Low text density often indicates visual content
  const wordCount = pageText.split(/\s+/).length;
  const lineCount = pageText.split('\n').length;
  
  // Very few words relative to lines suggests tables/charts
  if (lineCount > 5 && wordCount / lineCount < 3) {
    return true;
  }
  
  // Check for common chart/graph indicators
  const visualIndicators = [
    /figure\s*\d/i,
    /chart\s*\d/i,
    /graph\s*\d/i,
    /table\s*\d/i,
    /exhibit\s*\d/i,
    /illustration/i,
    /infographic/i,
    /\d+%.*\d+%.*\d+%/, // Multiple percentages (likely chart data)
    /^\s*\d+\s*$/m, // Lines with just numbers (likely data points)
  ];
  
  for (const pattern of visualIndicators) {
    if (pattern.test(pageText)) {
      return true;
    }
  }
  
  return false;
}

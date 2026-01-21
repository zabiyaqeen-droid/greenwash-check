import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import OpenAI from 'openai';
import { readFile, mkdir, rm, writeFile, unlink } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync } from 'fs';
import { 
  getAssessmentJob,
  startAssessmentJob,
  updateAssessmentJobProgress,
  completeAssessmentJob,
  failAssessmentJob,
  getAssessmentPrompts,
  type AssessmentJob,
  type AssessmentPrompt 
} from '$lib/supabase';
import {
  extractTextWithPages,
  splitTextIntoChunks,
  storeChunksWithEmbeddings,
  detectVisualContent
} from '$lib/embeddings';
import {
  extractClaims,
  assessAllSubcategories,
  aggregateResults,
  type SubcategoryConfig,
  type ExtractedClaim
} from '$lib/multi-prompt-analysis';

const execAsync = promisify(exec);

// Lazy initialization of OpenAI client
let _client: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI();
  }
  return _client;
}

// Access global uploaded files storage
declare global {
  var uploadedFiles: Map<string, { name: string; type: string; size: number; data: string }>;
}

// Get file from memory storage (fallback)
function getFileFromMemory(fileId: string): Buffer | null {
  if (!globalThis.uploadedFiles) return null;
  const file = globalThis.uploadedFiles.get(fileId);
  if (!file) return null;
  return Buffer.from(file.data, 'base64');
}

// Get file from database (document_data field)
function getFileFromDatabase(job: AssessmentJob): Buffer | null {
  if (!job.document_data) return null;
  return Buffer.from(job.document_data, 'base64');
}

// Get PDF page count
async function getPdfPageCount(pdfPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`pdfinfo "${pdfPath}" | grep Pages | awk '{print $2}'`);
    return parseInt(stdout.trim()) || 1;
  } catch (error) {
    console.error('Error getting page count:', error);
    return 1;
  }
}

// Convert specific PDF pages to images for vision analysis
async function convertPagesToImages(pdfPath: string, outputDir: string, pages: number[]): Promise<Map<number, string>> {
  const pageImages = new Map<number, string>();
  
  for (const page of pages) {
    try {
      await execAsync(`rm -f "${outputDir}"/page-*.png 2>/dev/null || true`);
      await execAsync(`pdftoppm -png -r 150 -f ${page} -l ${page} "${pdfPath}" "${outputDir}/page"`);
      
      const { stdout } = await execAsync(`ls -1 "${outputDir}"/page-*.png 2>/dev/null | head -1`);
      const actualPath = stdout.trim();
      if (actualPath && existsSync(actualPath)) {
        const uniquePath = join(outputDir, `page-${page}-unique.png`);
        await execAsync(`mv "${actualPath}" "${uniquePath}"`);
        pageImages.set(page, uniquePath);
      }
    } catch (error) {
      console.warn(`Could not convert page ${page} to image:`, error);
    }
  }
  
  return pageImages;
}

// Analyze visual elements using Vision API
async function analyzeVisualElements(
  imagePaths: Map<number, string>,
  extractTextFromImages: boolean = false
): Promise<{ visualClaims: any[]; extractedText: string }> {
  if (imagePaths.size === 0) {
    return { visualClaims: [], extractedText: '' };
  }
  
  const visualClaims: any[] = [];
  let allExtractedText = '';
  
  const entries = Array.from(imagePaths.entries());
  const batchSize = 5;
  
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    
    const imageContents: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
    const pageNumbers: number[] = [];
    
    for (const [pageNum, imagePath] of batch) {
      try {
        const imageBuffer = await readFile(imagePath);
        const base64Image = imageBuffer.toString('base64');
        imageContents.push({
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${base64Image}`,
            detail: 'high'
          }
        });
        pageNumbers.push(pageNum);
      } catch (error) {
        console.warn(`Could not read image for page ${pageNum}`);
      }
    }
    
    if (imageContents.length === 0) continue;
    
    const prompt = extractTextFromImages 
      ? `Analyze these pages from a document. You MUST:

1. EXTRACT ALL TEXT visible on each page
2. IDENTIFY environmental/sustainability claims
3. ANALYZE visual elements for environmental claims

Return JSON:
{
  "pages": [
    {
      "pageNumber": <number>,
      "extractedText": "all text content from this page...",
      "visualClaims": [
        {
          "description": "description of visual element",
          "type": "chart|graph|infographic|image|table|text",
          "claimsIdentified": ["claim 1", "claim 2"],
          "concerns": ["any concerns"]
        }
      ]
    }
  ]
}`
      : `Analyze these pages for VISUAL environmental claims.
Return JSON:
{
  "visualClaims": [
    {
      "description": "description of the visual element",
      "type": "chart|graph|infographic|image|table",
      "page": <page number from ${JSON.stringify(pageNumbers)}>,
      "claimsIdentified": ["claim 1", "claim 2"],
      "concerns": ["concern about this visual"]
    }
  ]
}`;

    try {
      const response = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: extractTextFromImages 
              ? 'You are an expert document analyzer. Extract ALL text and identify environmental claims.'
              : 'You are an expert in analyzing visual sustainability communications for potential greenwashing.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              ...imageContents
            ]
          }
        ],
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(content);
      
      if (extractTextFromImages && result.pages) {
        for (const page of result.pages) {
          if (page.extractedText) {
            allExtractedText += `\n\n[Page ${page.pageNumber}]\n${page.extractedText}`;
          }
          if (page.visualClaims) {
            for (const vc of page.visualClaims) {
              visualClaims.push({
                ...vc,
                page: page.pageNumber
              });
            }
          }
        }
      } else if (result.visualClaims) {
        visualClaims.push(...result.visualClaims);
      }
    } catch (error) {
      console.error('Error analyzing visual elements:', error);
    }
  }
  
  return { visualClaims, extractedText: allExtractedText.trim() };
}

// Convert dimensions to SubcategoryConfig array
function dimensionsToSubcategories(customPrompts?: AssessmentPrompt[]): SubcategoryConfig[] {
  // Default dimensions structure
  const defaultDimensions = [
    { id: 'dim1', name: 'Truthfulness & Accuracy', criteria: [
      { id: 'c1_1', name: 'Factual Accuracy', description: 'Claims must be factually correct and verifiable', weight: 1.0 },
      { id: 'c1_2', name: 'No Misleading Statements', description: 'No statements that could mislead consumers', weight: 1.0 },
      { id: 'c1_3', name: 'Complete Information', description: 'All relevant information is disclosed', weight: 1.0 }
    ]},
    { id: 'dim2', name: 'Substantiation', criteria: [
      { id: 'c2_1', name: 'Evidence-Based Claims', description: 'Claims are supported by credible evidence', weight: 1.0 },
      { id: 'c2_2', name: 'Third-Party Verification', description: 'Claims are verified by independent parties', weight: 1.0 },
      { id: 'c2_3', name: 'Data Transparency', description: 'Data and methodology are transparent', weight: 1.0 }
    ]},
    { id: 'dim3', name: 'Clarity & Specificity', criteria: [
      { id: 'c3_1', name: 'Clear Language', description: 'Claims use clear, understandable language', weight: 1.0 },
      { id: 'c3_2', name: 'Specific Claims', description: 'Claims are specific rather than vague', weight: 1.0 },
      { id: 'c3_3', name: 'Defined Terms', description: 'Technical terms are properly defined', weight: 1.0 }
    ]},
    { id: 'dim4', name: 'Relevance & Materiality', criteria: [
      { id: 'c4_1', name: 'Material Impact', description: 'Claims relate to material environmental impacts', weight: 1.0 },
      { id: 'c4_2', name: 'Relevant Context', description: 'Claims are presented in relevant context', weight: 1.0 },
      { id: 'c4_3', name: 'Proportionate Claims', description: 'Claims are proportionate to actual impact', weight: 1.0 }
    ]},
    { id: 'dim5', name: 'Comparisons & Benchmarks', criteria: [
      { id: 'c5_1', name: 'Fair Comparisons', description: 'Comparisons are fair and like-for-like', weight: 1.0 },
      { id: 'c5_2', name: 'Recognized Benchmarks', description: 'Uses recognized industry benchmarks', weight: 1.0 },
      { id: 'c5_3', name: 'Historical Accuracy', description: 'Historical comparisons are accurate', weight: 1.0 }
    ]},
    { id: 'dim6', name: 'Future Commitments', criteria: [
      { id: 'c6_1', name: 'Realistic Targets', description: 'Future targets are realistic and achievable', weight: 1.0 },
      { id: 'c6_2', name: 'Clear Timelines', description: 'Commitments have clear timelines', weight: 1.0 },
      { id: 'c6_3', name: 'Progress Tracking', description: 'Mechanisms for tracking progress exist', weight: 1.0 }
    ]}
  ];

  const subcategories: SubcategoryConfig[] = [];
  
  for (const dim of defaultDimensions) {
    const principleId = parseInt(dim.id.replace(/\D/g, '')) || subcategories.length + 1;
    
    for (const criterion of dim.criteria || []) {
      const customPrompt = customPrompts?.find(p => p.subcategory_id === criterion.id);
      
      subcategories.push({
        id: criterion.id,
        name: criterion.name,
        principleId: principleId,
        principleName: dim.name,
        description: customPrompt?.prompt_template || criterion.description,
        weight: customPrompt?.weight ?? criterion.weight ?? 1.0
      });
    }
  }
  
  return subcategories;
}

// Convert visual claims to ExtractedClaim format
function visualClaimsToExtractedClaims(visualClaims: any[]): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  let claimIndex = 1;
  
  for (const vc of visualClaims) {
    for (const claimText of vc.claimsIdentified || []) {
      claims.push({
        id: `visual_claim_${claimIndex++}`,
        text: claimText,
        source: `Visual element on page ${vc.page}: ${vc.description}`,
        category: 'visual',
        confidence: 0.8
      });
    }
  }
  
  return claims;
}

// Process a single job
async function processJob(job: AssessmentJob): Promise<void> {
  const jobId = job.id!;
  console.log(`[Job ${jobId}] Starting processing...`);
  
  await startAssessmentJob(jobId);
  await updateAssessmentJobProgress(jobId, 5, 'Initializing analysis...');
  
  let tempDir: string | null = null;
  
  try {
    // Get custom prompts
    const customPrompts = await getAssessmentPrompts(job.user_id);
    const subcategories = dimensionsToSubcategories(customPrompts);
    
    let extractedText = '';
    let visualClaims: any[] = [];
    
    if (job.input_type === 'text' && job.input_text) {
      // Text input mode
      extractedText = job.input_text;
      await updateAssessmentJobProgress(jobId, 15, 'Processing text input...');
    } else {
      // Document mode
      await updateAssessmentJobProgress(jobId, 10, 'Loading document...');
      
      // Get file from database first (persistent), then try memory (fallback)
      let fileBuffer = getFileFromDatabase(job);
      if (!fileBuffer) {
        // Fallback to memory storage
        fileBuffer = getFileFromMemory(job.document_id);
      }
      if (!fileBuffer) {
        throw new Error('Document not found. Please re-upload the document.');
      }
      
      // Create temp directory
      tempDir = `/tmp/job-${jobId}-${Date.now()}`;
      await mkdir(tempDir, { recursive: true });
      
      const fileName = job.document_name || 'document.pdf';
      const filePath = join(tempDir, fileName);
      await writeFile(filePath, fileBuffer);
      
      await updateAssessmentJobProgress(jobId, 15, 'Extracting text from document...');
      
      // Extract text using pdftotext
      const { text: pdfText, pageCount } = await extractTextWithPages(filePath);
      extractedText = pdfText;
      
      // Check if we need Vision API fallback
      const needsVisionFallback = !extractedText || extractedText.trim().length < 100;
      
      if (job.analysis_mode === 'hybrid' || job.analysis_mode === 'vision' || needsVisionFallback) {
        await updateAssessmentJobProgress(jobId, 25, 'Analyzing visual elements...');
        
        // Detect pages with visual content
        const visualPages = await detectVisualContent(filePath, pageCount);
        
        // Convert pages to images
        const pagesToConvert = needsVisionFallback 
          ? Array.from({ length: Math.min(pageCount, 50) }, (_, i) => i + 1)
          : visualPages.slice(0, 20);
        
        const pageImages = await convertPagesToImages(filePath, tempDir, pagesToConvert);
        
        await updateAssessmentJobProgress(jobId, 35, 'Processing visual content with AI...');
        
        const visionResult = await analyzeVisualElements(pageImages, needsVisionFallback);
        visualClaims = visionResult.visualClaims;
        
        if (needsVisionFallback && visionResult.extractedText) {
          extractedText = visionResult.extractedText;
        }
      }
    }
    
    await updateAssessmentJobProgress(jobId, 45, 'Extracting environmental claims...');
    
    // Extract claims from text
    const textClaims = await extractClaims(extractedText);
    const visualExtractedClaims = visualClaimsToExtractedClaims(visualClaims);
    const allClaims = [...textClaims, ...visualExtractedClaims];
    
    if (allClaims.length === 0) {
      throw new Error('No environmental claims found in the document.');
    }
    
    await updateAssessmentJobProgress(jobId, 55, `Found ${allClaims.length} claims. Assessing against ${subcategories.length} criteria...`);
    
    // Assess all subcategories
    const assessmentResults = await assessAllSubcategories(
      subcategories,
      allClaims,
      extractedText,
      (progress, step) => {
        const adjustedProgress = 55 + Math.floor(progress * 0.35);
        updateAssessmentJobProgress(jobId, adjustedProgress, step);
      }
    );
    
    await updateAssessmentJobProgress(jobId, 92, 'Aggregating results...');
    
    // Aggregate results
    const finalResult = aggregateResults(assessmentResults, subcategories);
    
    // Add metadata
    const result = {
      ...finalResult,
      documentName: job.document_name,
      analysisMode: job.analysis_mode,
      claimsAnalyzed: allClaims.length,
      visualClaimsCount: visualClaims.length,
      timestamp: new Date().toISOString()
    };
    
    await updateAssessmentJobProgress(jobId, 98, 'Finalizing assessment...');
    
    // Complete the job
    await completeAssessmentJob(jobId, result);
    
    console.log(`[Job ${jobId}] Completed successfully with score: ${result.overallScore}`);
    
    // Send email if provided
    if (job.email_address) {
      try {
        // TODO: Implement email sending
        console.log(`[Job ${jobId}] Would send email to: ${job.email_address}`);
      } catch (emailError) {
        console.error(`[Job ${jobId}] Failed to send email:`, emailError);
      }
    }
    
  } catch (error) {
    console.error(`[Job ${jobId}] Failed:`, error);
    await failAssessmentJob(jobId, error instanceof Error ? error.message : 'Unknown error');
  } finally {
    // Cleanup temp directory
    if (tempDir) {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.warn('Failed to cleanup temp directory:', e);
      }
    }
  }
}

// POST /api/process-job - Process a specific job by ID
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { jobId } = await request.json();
    
    if (!jobId) {
      return json({ error: 'Missing jobId' }, { status: 400 });
    }
    
    const job = await getAssessmentJob(jobId);
    
    if (!job) {
      return json({ error: 'Job not found' }, { status: 404 });
    }
    
    if (job.status !== 'pending') {
      return json({ error: 'Job is not in pending status', status: job.status }, { status: 400 });
    }
    
    // Process the job asynchronously (don't wait for completion)
    processJob(job).catch(err => {
      console.error(`Error processing job ${jobId}:`, err);
    });
    
    return json({ success: true, message: 'Job processing started' });
    
  } catch (error) {
    console.error('Error starting job processing:', error);
    return json({ error: 'Failed to start job processing' }, { status: 500 });
  }
};

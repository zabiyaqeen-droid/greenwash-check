import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile, mkdir, rm, writeFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync } from 'fs';
import { 
  getAssessmentPrompts, 
  saveAssessmentResult, 
  deleteDocumentChunks,
  type AssessmentPrompt 
} from '$lib/supabase';
import {
  extractTextWithPages,
  splitTextIntoChunks,
  storeChunksWithEmbeddings,
  detectVisualContent
} from '$lib/embeddings';
import {
  runMultiPromptAnalysis,
  extractClaims,
  assessAllSubcategories,
  aggregateResults,
  type SubcategoryConfig,
  type ExtractedClaim
} from '$lib/multi-prompt-analysis';

const execAsync = promisify(exec);

// Access global uploaded files storage
declare global {
  var uploadedFiles: Map<string, { name: string; type: string; size: number; data: string }>;
}

interface AnalyzeRequest {
  fileId: string;
  filePath: string;
  fileName: string;
  dimensions: any[];
  userId?: string;
}

// Download file from URL
async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  await writeFile(destPath, Buffer.from(arrayBuffer));
}

// Get file from memory storage
function getFileFromMemory(fileId: string): Buffer | null {
  if (!globalThis.uploadedFiles) return null;
  const file = globalThis.uploadedFiles.get(fileId);
  if (!file) return null;
  return Buffer.from(file.data, 'base64');
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

// Convert dimensions to SubcategoryConfig array
function dimensionsToSubcategories(
  dimensions: any[], 
  customPrompts?: AssessmentPrompt[]
): SubcategoryConfig[] {
  const subcategories: SubcategoryConfig[] = [];
  
  for (const dim of dimensions) {
    if (dim.enabled === false) continue;
    
    const principleId = parseInt(dim.id.replace(/\D/g, '')) || subcategories.length + 1;
    
    for (const criterion of dim.criteria || []) {
      if (criterion.enabled === false) continue;
      
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

// Format results for the frontend
function formatResultsForFrontend(
  result: any,
  dimensions: any[],
  fileName: string,
  totalPages: number,
  pagesAnalyzed: number,
  textChunksCount: number
): any {
  return {
    overallScore: result.overallScore,
    riskLevel: result.riskLevel,
    executiveSummary: result.executiveSummary,
    totalClaimsAnalyzed: result.totalClaimsAnalyzed,
    textClaimsCount: result.totalClaimsAnalyzed,
    visualClaimsCount: 0, // Not doing vision analysis in this version
    principleScores: result.principleScores.map((ps: any) => ({
      id: ps.id.toString(),
      name: ps.name,
      principle: ps.principle,
      overallScore: ps.overallScore,
      status: ps.status,
      summary: ps.summary,
      subcategories: ps.subcategories.map((sub: any) => ({
        id: sub.subcategoryId,
        name: sub.subcategoryName,
        score: sub.score,
        status: sub.status,
        rationale: sub.rationale,
        weight: sub.weight,
        evidence: sub.evidenceUsed,
        recommendations: sub.recommendations
      }))
    })),
    keyStrengths: result.keyStrengths,
    criticalIssues: result.criticalIssues,
    legalRiskAssessment: result.legalRiskAssessment,
    metadata: {
      fileName,
      totalPages,
      pagesAnalyzed,
      textChunksProcessed: textChunksCount,
      visualPagesAnalyzed: 0,
      processingTimeSeconds: Math.round(result.metadata.totalDuration / 1000),
      assessmentDate: new Date().toISOString(),
      framework: 'Competition Bureau 6 Principles + Bill C-59 (Multi-Prompt Parallel Analysis)',
      analysisMetrics: {
        claimExtractionDuration: result.metadata.claimExtractionDuration,
        assessmentDuration: result.metadata.assessmentDuration,
        aggregationDuration: result.metadata.aggregationDuration,
        subcategoriesSucceeded: result.metadata.subcategoriesSucceeded,
        subcategoriesFailed: result.metadata.subcategoriesFailed
      }
    }
  };
}

export const POST: RequestHandler = async ({ request }) => {
  const startTime = Date.now();
  let localFilePath: string | null = null;
  let tempDir: string | null = null;
  
  try {
    const body: AnalyzeRequest = await request.json();
    const { fileId, filePath, fileName, dimensions, userId } = body;

    console.log(`[PARALLEL] Starting multi-prompt parallel analysis of ${fileName}`);

    // Fetch custom prompts
    let customPrompts: AssessmentPrompt[] = [];
    try {
      customPrompts = await getAssessmentPrompts(userId);
      console.log(`[PARALLEL] Loaded ${customPrompts.length} assessment prompts`);
    } catch (promptError) {
      console.warn('Could not load custom prompts:', promptError);
    }

    // Create temp directory
    tempDir = `/tmp/greenwash-parallel-${fileId}`;
    await mkdir(tempDir, { recursive: true });
    
    localFilePath = join(tempDir, `document.pdf`);

    // Get the file
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      await downloadFile(filePath, localFilePath);
    } else if (filePath.startsWith('memory://')) {
      const memoryFileId = filePath.replace('memory://', '');
      const fileBuffer = getFileFromMemory(memoryFileId);
      if (!fileBuffer) {
        return json({ error: 'File not found in memory.' }, { status: 400 });
      }
      await writeFile(localFilePath, fileBuffer);
    } else if (existsSync(filePath)) {
      localFilePath = filePath;
    } else {
      return json({ error: 'File not found.' }, { status: 400 });
    }

    const totalPages = await getPdfPageCount(localFilePath);
    const pagesToProcess = Math.min(totalPages, 200);
    
    console.log(`[PARALLEL] Document has ${totalPages} pages, processing ${pagesToProcess}`);

    // Delete any existing chunks for this document
    await deleteDocumentChunks(fileId);
    
    // Extract text from PDF
    console.log('[PARALLEL] Extracting text from PDF...');
    const pagesWithText = await extractTextWithPages(localFilePath);
    const textChunks: Array<{ content: string; pageNumber: number; metadata: any }> = [];
    
    for (const { page, text } of pagesWithText) {
      const chunks = splitTextIntoChunks(text);
      for (const chunk of chunks) {
        textChunks.push({
          content: chunk,
          pageNumber: page,
          metadata: { hasVisualContent: detectVisualContent(text) }
        });
      }
    }
    
    console.log(`[PARALLEL] Extracted ${textChunks.length} text chunks from ${pagesWithText.length} pages`);
    
    // Store chunks with embeddings for future use
    if (textChunks.length > 0 && userId) {
      await storeChunksWithEmbeddings(fileId, userId, textChunks);
    }
    
    // Combine text for analysis
    const combinedText = textChunks
      .slice(0, 100) // Limit to first 100 chunks to stay within token limits
      .map(c => `[Page ${c.pageNumber || 'N/A'}]\n${c.content}`)
      .join('\n\n---\n\n');
    
    // Convert dimensions to subcategory configs
    const subcategories = dimensionsToSubcategories(dimensions, customPrompts);
    console.log(`[PARALLEL] Configured ${subcategories.length} subcategories for assessment`);
    
    // Run multi-prompt parallel analysis
    console.log('[PARALLEL] Starting multi-prompt parallel analysis...');
    const analysisResult = await runMultiPromptAnalysis(
      combinedText,
      subcategories,
      combinedText.slice(0, 5000) // Additional context
    );
    
    // Format results for frontend
    const formattedResult = formatResultsForFrontend(
      analysisResult,
      dimensions,
      fileName,
      totalPages,
      pagesToProcess,
      textChunks.length
    );
    
    const processingTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`[PARALLEL] Analysis complete in ${processingTime} seconds`);
    console.log(`[PARALLEL] Claims extracted: ${analysisResult.totalClaimsAnalyzed}`);
    console.log(`[PARALLEL] Overall score: ${analysisResult.overallScore}`);

    // Save assessment result
    if (userId) {
      try {
        await saveAssessmentResult({
          user_id: userId,
          document_id: fileId,
          document_name: fileName,
          overall_score: formattedResult.overallScore || 0,
          risk_level: formattedResult.riskLevel || 'Unknown',
          principle_scores: formattedResult.principleScores || {},
          findings: formattedResult.criticalIssues || [],
          recommendations: formattedResult.legalRiskAssessment?.priorityActions || []
        });
      } catch (saveError) {
        console.warn('Could not save assessment result:', saveError);
      }
    }

    // Clean up temp directory
    if (tempDir) {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    return json({
      success: true,
      analysisType: 'multi-prompt-parallel',
      assessment: formattedResult
    });

  } catch (error) {
    console.error('[PARALLEL] Analysis error:', error);
    
    // Clean up on error
    if (tempDir) {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    return json({
      error: 'Analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

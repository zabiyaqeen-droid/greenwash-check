import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFile, appendFile, mkdir, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Store for tracking chunked uploads
declare global {
  var chunkUploads: Map<string, { 
    fileName: string; 
    totalChunks: number; 
    receivedChunks: Set<number>;
    filePath: string;
  }>;
}

if (!globalThis.chunkUploads) {
  globalThis.chunkUploads = new Map();
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const chunk = formData.get('chunk') as File;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const fileId = formData.get('fileId') as string;
    const fileName = formData.get('fileName') as string;
    
    if (!chunk || isNaN(chunkIndex) || isNaN(totalChunks) || !fileId) {
      return json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Create uploads directory
    const uploadsDir = '/tmp/greenwash-uploads';
    await mkdir(uploadsDir, { recursive: true });
    const filePath = join(uploadsDir, `${fileId}.pdf`);

    // Initialize upload tracking
    if (!globalThis.chunkUploads.has(fileId)) {
      globalThis.chunkUploads.set(fileId, {
        fileName,
        totalChunks,
        receivedChunks: new Set(),
        filePath
      });
    }

    const uploadInfo = globalThis.chunkUploads.get(fileId)!;
    
    // Write chunk to file
    const arrayBuffer = await chunk.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    if (chunkIndex === 0) {
      // First chunk - create new file
      await writeFile(filePath, buffer);
    } else {
      // Append to existing file
      await appendFile(filePath, buffer);
    }
    
    uploadInfo.receivedChunks.add(chunkIndex);
    
    // Check if all chunks received
    const isComplete = uploadInfo.receivedChunks.size === totalChunks;
    
    if (isComplete) {
      // Verify file exists and get size
      const stats = await stat(filePath);
      
      // Clean up tracking
      globalThis.chunkUploads.delete(fileId);
      
      return json({
        success: true,
        complete: true,
        fileId,
        filePath,
        fileName,
        fileSize: stats.size,
        storage: 'filesystem'
      });
    }
    
    return json({
      success: true,
      complete: false,
      receivedChunks: uploadInfo.receivedChunks.size,
      totalChunks
    });
    
  } catch (error) {
    console.error('Chunk upload error:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }, { status: 500 });
  }
};

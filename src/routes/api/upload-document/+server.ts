import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { put } from '@vercel/blob';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Declare global for in-memory file storage fallback
declare global {
  var uploadedFiles: Map<string, { name: string; type: string; size: number; data: string }>;
}

if (!globalThis.uploadedFiles) {
  globalThis.uploadedFiles = new Map();
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Validate file type
    const validTypes = ['.pdf', '.docx', '.txt'];
    const fileExt = '.' + (file.name.split('.').pop()?.toLowerCase() || 'pdf');
    
    if (!validTypes.includes(fileExt)) {
      return json({ error: 'Invalid file type. Please upload PDF, DOCX, or TXT.' }, { status: 400 });
    }
    
    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      return json({ error: 'File too large. Maximum size is 50MB.' }, { status: 400 });
    }
    
    // Generate unique file ID
    const fileId = randomUUID();
    const fileName = `${fileId}${fileExt}`;
    
    // Check if Vercel Blob is configured
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        // Upload to Vercel Blob
        const blob = await put(fileName, file, {
          access: 'public',
          addRandomSuffix: false
        });
        
        console.log(`File uploaded to Vercel Blob: ${blob.url}`);
        
        return json({
          success: true,
          fileId,
          filePath: blob.url,
          fileName: file.name,
          fileSize: file.size,
          fileType: fileExt,
          storage: 'blob'
        });
      } catch (blobError) {
        console.error('Vercel Blob upload failed, falling back to memory:', blobError);
        // Fall through to memory storage
      }
    }
    
    // Fallback: Store file in memory or filesystem
    const arrayBuffer = await file.arrayBuffer();
    
    // Try filesystem first (for local development)
    try {
      const uploadsDir = '/tmp/greenwash-uploads';
      await mkdir(uploadsDir, { recursive: true });
      const filePath = join(uploadsDir, fileName);
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(filePath, buffer);
      
      console.log(`File saved to filesystem: ${filePath}`);
      
      return json({
        success: true,
        fileId,
        filePath,
        fileName: file.name,
        fileSize: file.size,
        fileType: fileExt,
        storage: 'filesystem'
      });
    } catch (fsError) {
      // Filesystem not available (serverless), use memory
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      globalThis.uploadedFiles.set(fileId, {
        name: file.name,
        type: fileExt,
        size: file.size,
        data: base64
      });
      
      console.log(`File stored in memory: ${fileId}`);
      
      return json({
        success: true,
        fileId,
        filePath: `memory://${fileId}`,
        fileName: file.name,
        fileSize: file.size,
        fileType: fileExt,
        storage: 'memory'
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }, { status: 500 });
  }
};

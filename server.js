import { handler } from './build/handler.js';
import express from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';

// Create upload directory
const uploadDir = '/tmp/greenwash-uploads';
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileId = randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${fileId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Create Express app
const app = express();

// Handle file uploads BEFORE SvelteKit (bypasses SvelteKit's body limit)
app.post('/api/upload-document', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileId = path.basename(req.file.filename, path.extname(req.file.filename));
    const filePath = req.file.path;
    
    console.log(`File uploaded: ${req.file.originalname} -> ${filePath} (${req.file.size} bytes)`);

    res.json({
      success: true,
      fileId,
      fileName: req.file.originalname,
      filePath,
      fileSize: req.file.size,
      fileType: req.file.mimetype
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// Pass all other requests to SvelteKit
app.use(handler);

// Start server
const port = process.env.PORT || 5192;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});

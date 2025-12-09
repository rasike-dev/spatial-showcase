import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { query } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import fs from 'fs';
import { put, del } from '@vercel/blob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if Vercel Blob is configured
const useBlobStorage = !!process.env.BLOB_READ_WRITE_TOKEN;

// Configure multer based on storage type
let upload;
let uploadDir;

if (useBlobStorage) {
  // Use memory storage for Vercel Blob (file will be in req.file.buffer)
  const memoryStorage = multer.memoryStorage();
  upload = multer({
    storage: memoryStorage,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        ...(process.env.ALLOWED_IMAGE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/webp']),
        ...(process.env.ALLOWED_VIDEO_TYPES?.split(',') || ['video/mp4', 'video/webm'])
      ];

      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} not allowed`));
      }
    }
  });
} else {
  // Use disk storage for local development
  uploadDir = process.env.UPLOAD_DIR || './uploads';
  
  // Only create directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
  });

  upload = multer({
    storage: diskStorage,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        ...(process.env.ALLOWED_IMAGE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/webp']),
        ...(process.env.ALLOWED_VIDEO_TYPES?.split(',') || ['video/mp4', 'video/webm'])
      ];

      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} not allowed`));
      }
    }
  });
}

const router = express.Router();

// Upload media file
router.post('/upload', authenticateToken, upload.single('file'), async (req, res, next) => {
  let uploadedBlobUrl = null;
  let localFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { project_id, portfolio_id, type, order_index, name, title } = req.body;

    if (!type || !(project_id || portfolio_id)) {
      // Clean up uploaded file if validation fails
      if (useBlobStorage && uploadedBlobUrl) {
        try {
          await del(uploadedBlobUrl);
        } catch (err) {
          console.error('Failed to delete blob:', err);
        }
      } else if (req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('Failed to delete local file:', err);
        }
      }
      return res.status(400).json({ error: 'Type and project_id or portfolio_id are required' });
    }

    // Verify ownership if project_id provided
    if (project_id) {
      const projectCheck = await query(
        `SELECT p.user_id FROM projects pr
         JOIN portfolios p ON pr.portfolio_id = p.id
         WHERE pr.id = $1`,
        [project_id]
      );

      if (projectCheck.rows.length === 0) {
        if (useBlobStorage && uploadedBlobUrl) {
          await del(uploadedBlobUrl).catch(() => {});
        } else if (req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ error: 'Project not found' });
      }

      if (projectCheck.rows[0].user_id !== req.user.userId) {
        if (useBlobStorage && uploadedBlobUrl) {
          await del(uploadedBlobUrl).catch(() => {});
        } else if (req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Verify ownership if portfolio_id provided
    if (portfolio_id) {
      const portfolioCheck = await query(
        'SELECT user_id FROM portfolios WHERE id = $1',
        [portfolio_id]
      );

      if (portfolioCheck.rows.length === 0) {
        if (useBlobStorage && uploadedBlobUrl) {
          await del(uploadedBlobUrl).catch(() => {});
        } else if (req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ error: 'Portfolio not found' });
      }

      if (portfolioCheck.rows[0].user_id !== req.user.userId) {
        if (useBlobStorage && uploadedBlobUrl) {
          await del(uploadedBlobUrl).catch(() => {});
        } else if (req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Upload file to storage
    let fileUrl;
    
    if (useBlobStorage) {
      // Upload to Vercel Blob
      const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${req.file.originalname}`;
      const blob = await put(uniqueFilename, req.file.buffer, {
        access: 'public',
        contentType: req.file.mimetype,
      });
      uploadedBlobUrl = blob.url;
      fileUrl = blob.url;
    } else {
      // Use local file path
      fileUrl = `/uploads/${req.file.filename}`;
      localFilePath = req.file.path;
    }

    // Use provided name/title, or derive from filename
    const mediaName = name || req.file.originalname;
    const mediaTitle = title || req.file.originalname.replace(/\.[^/.]+$/, ''); // Remove extension

    const result = await query(
      `INSERT INTO media (project_id, portfolio_id, type, url, filename, file_size, mime_type, order_index, name, title)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, project_id, portfolio_id, type, url, filename, file_size, mime_type, order_index, name, title, created_at`,
      [
        project_id || null,
        portfolio_id || null,
        type,
        fileUrl,
        req.file.originalname,
        req.file.size,
        req.file.mimetype,
        order_index || 0,
        mediaName,
        mediaTitle
      ]
    );

    res.status(201).json({ media: result.rows[0] });
  } catch (error) {
    console.error('[Media Route] Upload error:', error);
    console.error('[Media Route] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      constraint: error.constraint,
      detail: error.detail
    });
    
    // Clean up uploaded file if it exists
    if (useBlobStorage && uploadedBlobUrl) {
      try {
        await del(uploadedBlobUrl);
      } catch (unlinkError) {
        console.error('[Media Route] Failed to delete blob:', unlinkError);
      }
    } else if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('[Media Route] Failed to delete uploaded file:', unlinkError);
      }
    }
    
    // Provide more specific error messages
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Invalid project_id or portfolio_id' });
    }
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Media with this identifier already exists' });
    }
    
    next(error);
  }
});

// Get media for project or portfolio
router.get('/', async (req, res, next) => {
  try {
    const { project_id, portfolio_id } = req.query;

    let result;
    if (project_id) {
      result = await query(
        'SELECT * FROM media WHERE project_id = $1 ORDER BY order_index ASC',
        [project_id]
      );
    } else if (portfolio_id) {
      result = await query(
        'SELECT * FROM media WHERE portfolio_id = $1 ORDER BY order_index ASC',
        [portfolio_id]
      );
    } else {
      return res.status(400).json({ error: 'project_id or portfolio_id required' });
    }

    res.json({ media: result.rows });
  } catch (error) {
    next(error);
  }
});

// Update media (name, title, order_index)
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, title, order_index } = req.body;

    // Get media info and verify ownership
    const mediaCheck = await query(
      `SELECT m.*, p.user_id as portfolio_user_id
       FROM media m
       LEFT JOIN portfolios p ON m.portfolio_id = p.id
       LEFT JOIN projects pr ON m.project_id = pr.id
       LEFT JOIN portfolios p2 ON pr.portfolio_id = p2.id
       WHERE m.id = $1`,
      [id]
    );

    if (mediaCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const media = mediaCheck.rows[0];
    const ownerId = media.portfolio_user_id || media.user_id;

    if (ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }

    if (order_index !== undefined) {
      updates.push(`order_index = $${paramCount++}`);
      values.push(order_index);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id); // Add id for WHERE clause

    const result = await query(
      `UPDATE media SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, project_id, portfolio_id, type, url, filename, name, title, file_size, mime_type, order_index, created_at`,
      values
    );

    res.json({ media: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete media
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get media info and verify ownership
    const mediaCheck = await query(
      `SELECT m.*, p.user_id as portfolio_user_id
       FROM media m
       LEFT JOIN portfolios p ON m.portfolio_id = p.id
       LEFT JOIN projects pr ON m.project_id = pr.id
       LEFT JOIN portfolios p2 ON pr.portfolio_id = p2.id
       WHERE m.id = $1`,
      [id]
    );

    if (mediaCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const media = mediaCheck.rows[0];
    const ownerId = media.portfolio_user_id || media.user_id;

    if (ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete file from storage
    if (useBlobStorage && media.url.startsWith('http')) {
      // Delete from Vercel Blob (URL is a full Blob URL)
      try {
        await del(media.url);
      } catch (blobError) {
        console.error('[Media Route] Failed to delete blob:', blobError);
        // Continue with database deletion even if blob deletion fails
      }
    } else if (!useBlobStorage && media.url.startsWith('/uploads/')) {
      // Delete from local filesystem
      const filePath = join(__dirname, '../../', media.url);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fsError) {
          console.error('[Media Route] Failed to delete local file:', fsError);
        }
      }
    }

    // Delete from database
    await query('DELETE FROM media WHERE id = $1', [id]);

    res.json({ message: 'Media deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Serve uploaded files with CORS headers (only for local development)
if (!useBlobStorage && uploadDir) {
  router.use('/uploads', (req, res, next) => {
    // Set CORS headers for static files (matching global CORS config)
    const origin = req.headers.origin;
    
    // In development, allow all localhost origins
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      if (origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    } else {
      // In production, check against allowed origins
      const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    }
    
    // Allow all methods and headers for preflight requests
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.status(200).end();
    }
    
    next();
  }, express.static(uploadDir));
}

export default router;

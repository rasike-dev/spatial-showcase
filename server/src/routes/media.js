import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { query } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
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

const router = express.Router();

// Upload media file
router.post('/upload', authenticateToken, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { project_id, portfolio_id, type, order_index } = req.body;

    if (!type || !(project_id || portfolio_id)) {
      // Clean up uploaded file if validation fails
      fs.unlinkSync(req.file.path);
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
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Project not found' });
      }

      if (projectCheck.rows[0].user_id !== req.user.userId) {
        fs.unlinkSync(req.file.path);
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
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Portfolio not found' });
      }

      if (portfolioCheck.rows[0].user_id !== req.user.userId) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Construct URL (in production, this would be a CDN URL)
    const fileUrl = `/uploads/${req.file.filename}`;

    const result = await query(
      `INSERT INTO media (project_id, portfolio_id, type, url, filename, file_size, mime_type, order_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, project_id, portfolio_id, type, url, filename, file_size, mime_type, order_index, created_at`,
      [
        project_id || null,
        portfolio_id || null,
        type,
        fileUrl,
        req.file.originalname,
        req.file.size,
        req.file.mimetype,
        order_index || 0
      ]
    );

    res.status(201).json({ media: result.rows[0] });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
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

    // Delete file from filesystem
    const filePath = join(__dirname, '../../', media.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await query('DELETE FROM media WHERE id = $1', [id]);

    res.json({ message: 'Media deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Serve uploaded files
router.use('/uploads', express.static(uploadDir));

export default router;


import express from 'express';
import { query } from '../db/connection.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = express.Router();

// Get all portfolios for authenticated user
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, title, description, template_id, settings, is_public, 
              share_token, created_at, updated_at
       FROM portfolios
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [req.user.userId]
    );

    res.json({ portfolios: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get single portfolio by ID
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const result = await query(
      `SELECT p.*, u.name as owner_name, u.email as owner_email
       FROM portfolios p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    const portfolio = result.rows[0];

    // Check if user has access
    if (!portfolio.is_public && portfolio.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ portfolio });
  } catch (error) {
    next(error);
  }
});

// Create new portfolio
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { title, description, template_id, settings } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Generate share token
    const shareToken = crypto.randomBytes(32).toString('hex');

    const result = await query(
      `INSERT INTO portfolios (user_id, title, description, template_id, settings, share_token)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, description, template_id, settings, is_public, share_token, created_at`,
      [
        req.user.userId,
        title,
        description || null,
        template_id || 'creative-portfolio',
        JSON.stringify(settings || {}),
        shareToken
      ]
    );

    res.status(201).json({ portfolio: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update portfolio
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, template_id, settings, is_public } = req.body;

    // Verify ownership
    const portfolioCheck = await query(
      'SELECT user_id FROM portfolios WHERE id = $1',
      [id]
    );

    if (portfolioCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    if (portfolioCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (template_id !== undefined) {
      updates.push(`template_id = $${paramCount++}`);
      values.push(template_id);
    }

    if (settings !== undefined) {
      updates.push(`settings = $${paramCount++}`);
      values.push(JSON.stringify(settings));
    }

    if (is_public !== undefined) {
      updates.push(`is_public = $${paramCount++}`);
      values.push(is_public);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE portfolios SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, title, description, template_id, settings, is_public, share_token, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio not found after update' });
    }

    const portfolio = result.rows[0];
    // Parse settings if it's a string (JSONB)
    if (portfolio.settings && typeof portfolio.settings === 'string') {
      try {
        portfolio.settings = JSON.parse(portfolio.settings);
      } catch (e) {
        // If parsing fails, keep as is
        portfolio.settings = {};
      }
    } else if (!portfolio.settings) {
      portfolio.settings = {};
    }

    console.log('✅ Portfolio updated successfully:', { id: portfolio.id, title: portfolio.title });
    console.log('📤 Sending response to client...');
    
    const response = { portfolio };
    res.json(response);
    console.log('✅ Response sent successfully');
  } catch (error) {
    next(error);
  }
});

// Delete portfolio
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const portfolioCheck = await query(
      'SELECT user_id FROM portfolios WHERE id = $1',
      [id]
    );

    if (portfolioCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    if (portfolioCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await query('DELETE FROM portfolios WHERE id = $1', [id]);

    res.json({ message: 'Portfolio deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;


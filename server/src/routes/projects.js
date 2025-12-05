import express from 'express';
import { query } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all projects for a portfolio
router.get('/portfolio/:portfolioId', async (req, res, next) => {
  try {
    const { portfolioId } = req.params;

    const result = await query(
      `SELECT id, title, description, order_index, created_at, updated_at
       FROM projects
       WHERE portfolio_id = $1
       ORDER BY order_index ASC, created_at ASC`,
      [portfolioId]
    );

    res.json({ projects: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get single project
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Create new project
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { portfolio_id, title, description, order_index } = req.body;

    if (!portfolio_id || !title) {
      return res.status(400).json({ error: 'Portfolio ID and title are required' });
    }

    // Verify portfolio ownership
    const portfolioCheck = await query(
      'SELECT user_id FROM portfolios WHERE id = $1',
      [portfolio_id]
    );

    if (portfolioCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    if (portfolioCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `INSERT INTO projects (portfolio_id, title, description, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING id, portfolio_id, title, description, order_index, created_at`,
      [portfolio_id, title, description || null, order_index || 0]
    );

    res.status(201).json({ project: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update project
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, order_index } = req.body;

    // Verify ownership through portfolio
    const projectCheck = await query(
      `SELECT p.user_id FROM projects pr
       JOIN portfolios p ON pr.portfolio_id = p.id
       WHERE pr.id = $1`,
      [id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (projectCheck.rows[0].user_id !== req.user.userId) {
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

    if (order_index !== undefined) {
      updates.push(`order_index = $${paramCount++}`);
      values.push(order_index);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE projects SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, portfolio_id, title, description, order_index, updated_at`,
      values
    );

    res.json({ project: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete project
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const projectCheck = await query(
      `SELECT p.user_id FROM projects pr
       JOIN portfolios p ON pr.portfolio_id = p.id
       WHERE pr.id = $1`,
      [id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (projectCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await query('DELETE FROM projects WHERE id = $1', [id]);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;


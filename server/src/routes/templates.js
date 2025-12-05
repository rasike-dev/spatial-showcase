import express from 'express';
import { query } from '../db/connection.js';

const router = express.Router();

// Get all active templates
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, description, category, preview_image_url, config FROM templates WHERE is_active = true ORDER BY name ASC'
    );

    res.json({ templates: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get single template
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM templates WHERE id = $1 AND is_active = true',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;


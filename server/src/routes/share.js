import express from 'express';
import { query } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import QRCode from 'qrcode';
import crypto from 'crypto';

const router = express.Router();

// Get portfolio by share token
router.get('/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const result = await query(
      `SELECT p.*, u.name as owner_name
       FROM portfolios p
       JOIN users u ON p.user_id = u.id
       WHERE p.share_token = $1 OR p.id IN (
         SELECT portfolio_id FROM share_links WHERE token = $1
       )`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    const portfolio = result.rows[0];

    // Track view
    await query(
      `INSERT INTO analytics_events (portfolio_id, event_type, event_data)
       VALUES ($1, 'view', $2)`,
      [portfolio.id, JSON.stringify({ source: 'share_link' })]
    );

    res.json({ portfolio });
  } catch (error) {
    next(error);
  }
});

// Generate share link (creates a share_links entry)
router.post('/:portfolioId/generate', authenticateToken, async (req, res, next) => {
  try {
    const { portfolioId } = req.params;
    const { expires_in_days, password } = req.body;

    // Verify portfolio ownership
    const portfolioCheck = await query(
      'SELECT user_id FROM portfolios WHERE id = $1',
      [portfolioId]
    );

    if (portfolioCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    if (portfolioCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');

    // Calculate expiration
    const expiresAt = expires_in_days
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000)
      : null;

    await query(
      `INSERT INTO share_links (portfolio_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (token) DO NOTHING`,
      [portfolioId, token, expiresAt]
    );

    // Get or create share token for portfolio
    let shareToken = token;
    const portfolioResult = await query(
      'SELECT share_token FROM portfolios WHERE id = $1',
      [portfolioId]
    );

    if (!portfolioResult.rows[0].share_token) {
      // Update portfolio with share token
      await query(
        'UPDATE portfolios SET share_token = $1 WHERE id = $2',
        [token, portfolioId]
      );
    } else {
      shareToken = portfolioResult.rows[0].share_token;
    }

    const shareUrl = `${process.env.VR_APP_URL || 'http://localhost:8081'}/view/${shareToken}`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(shareUrl, {
      width: 300,
      margin: 2
    });

    res.json({
      shareUrl,
      token: shareToken,
      qrCode: qrCodeDataUrl,
      expiresAt
    });
  } catch (error) {
    next(error);
  }
});

export default router;


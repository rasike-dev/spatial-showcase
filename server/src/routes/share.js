import express from 'express';
import { query } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Get portfolio by share token
router.get('/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    console.log('[Share Route] ========== FETCHING PORTFOLIO ==========');
    console.log('[Share Route] Token received:', token);
    console.log('[Share Route] Request URL:', req.originalUrl);
    console.log('[Share Route] Request method:', req.method);

    // First check share_links table for the token
    const shareLinkResult = await query(
      `SELECT sl.portfolio_id, sl.expires_at, sl.token
       FROM share_links sl
       WHERE sl.token = $1
       AND (sl.expires_at IS NULL OR sl.expires_at > NOW())`,
      [token]
    );

    let portfolioId = null;
    
    if (shareLinkResult.rows.length > 0) {
      // Found in share_links table
      portfolioId = shareLinkResult.rows[0].portfolio_id;
      console.log('[Share Route] Found in share_links, portfolio_id:', portfolioId);
    } else {
      // Check if token matches portfolio share_token
      const portfolioResult = await query(
        `SELECT id FROM portfolios WHERE share_token = $1`,
        [token]
      );
      
      if (portfolioResult.rows.length > 0) {
        portfolioId = portfolioResult.rows[0].id;
        console.log('[Share Route] Found via portfolio share_token, portfolio_id:', portfolioId);
      }
    }

    if (!portfolioId) {
      console.log('[Share Route] Token not found:', token);
      return res.status(404).json({ error: 'Portfolio not found or share link expired' });
    }

    // Fetch portfolio data
    const result = await query(
      `SELECT p.*, u.name as owner_name
       FROM portfolios p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [portfolioId]
    );

    if (result.rows.length === 0) {
      console.log('[Share Route] Portfolio not found for ID:', portfolioId);
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    const portfolio = result.rows[0];
    console.log('[Share Route] ✅ Portfolio found:', {
      id: portfolio.id,
      title: portfolio.title,
      user_id: portfolio.user_id
    });

    // Track view (non-blocking)
    query(
      `INSERT INTO analytics_events (portfolio_id, event_type, event_data)
       VALUES ($1, 'view', $2)`,
      [portfolio.id, JSON.stringify({ source: 'share_link', token: token })]
    ).catch(err => {
      console.error('[Share Route] Error tracking view:', err);
      // Don't fail the request if analytics fails
    });

    console.log('[Share Route] ✅ Sending portfolio response');
    res.json({ portfolio });
    console.log('[Share Route] ✅ Response sent successfully');
  } catch (error) {
    console.error('[Share Route] Error:', error);
    next(error);
  }
});

// Generate share link (creates a share_links entry)
router.post('/:portfolioId/generate', authenticateToken, async (req, res, next) => {
  // Set a timeout for the entire request (5 seconds max)
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('[Share Route] Request timeout after 5 seconds');
      res.status(504).json({ error: 'Request timeout - share link generation took too long' });
    }
  }, 5000);

  try {
    console.log('[Share Route] Generate request received:', {
      portfolioId: req.params.portfolioId,
      userId: req.user?.userId,
      timestamp: new Date().toISOString()
    });
    
    const { portfolioId } = req.params;
    const { expires_in_days, password } = req.body;

    // Verify portfolio ownership
    console.log('[Share Route] Checking portfolio ownership...');
    const portfolioCheck = await query(
      'SELECT user_id, share_token FROM portfolios WHERE id = $1',
      [portfolioId]
    );
    console.log('[Share Route] Portfolio check result:', portfolioCheck.rows.length > 0);

    if (portfolioCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    if (portfolioCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if share link already exists and is still valid
    console.log('[Share Route] Checking for existing share link...');
    let existingLink;
    try {
      existingLink = await query(
        `SELECT token, expires_at FROM share_links 
         WHERE portfolio_id = $1 
         AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at DESC
         LIMIT 1`,
        [portfolioId],
        2000 // 2 second timeout for this query
      );
      console.log('[Share Route] Existing link found:', existingLink.rows.length > 0);
    } catch (error) {
      console.error('[Share Route] Error checking existing link:', error);
      // Continue to create new link if check fails
      existingLink = { rows: [] };
    }

    let shareToken;
    let expiresAt = null;

    if (existingLink.rows.length > 0) {
      // Reuse existing share link
      shareToken = existingLink.rows[0].token;
      expiresAt = existingLink.rows[0].expires_at;
      console.log('[Share Route] Reusing existing share token');
    } else {
      // Generate new token
      shareToken = crypto.randomBytes(32).toString('hex');
      console.log('[Share Route] Generated new token');

      // Calculate expiration
      expiresAt = expires_in_days
        ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000)
        : null;

      // Create new share link (simplified - no ON CONFLICT to avoid locks)
      try {
        await query(
          `INSERT INTO share_links (portfolio_id, token, expires_at)
           VALUES ($1, $2, $3)`,
          [portfolioId, shareToken, expiresAt],
          2000 // 2 second timeout
        );
        console.log('[Share Route] Share link inserted');
      } catch (error) {
        // If insert fails due to duplicate token (very unlikely), try again with new token
        if (error.code === '23505') { // Unique violation
          console.warn('[Share Route] Token collision, generating new token');
          shareToken = crypto.randomBytes(32).toString('hex');
          await query(
            `INSERT INTO share_links (portfolio_id, token, expires_at)
             VALUES ($1, $2, $3)`,
            [portfolioId, shareToken, expiresAt],
            2000
          );
        } else {
          throw error;
        }
      }

      // Update portfolio with share token if it doesn't have one
      if (!portfolioCheck.rows[0].share_token) {
        try {
          await query(
            'UPDATE portfolios SET share_token = $1 WHERE id = $2',
            [shareToken, portfolioId],
            2000
          );
          console.log('[Share Route] Portfolio share_token updated');
        } catch (error) {
          console.error('[Share Route] Error updating portfolio share_token:', error);
          // Non-critical, continue
        }
      }
    }

    // Use hash fragment instead of query parameter to avoid Vite routing issues
    // Hash fragments are handled entirely client-side
    // Use HTTPS if mkcert is enabled (which it is in vite.config.js)
    // Force HTTPS to match the VR app's actual URL
    let baseUrl = process.env.VR_APP_URL || 'https://localhost:8081';
    baseUrl = baseUrl.replace(/\/$/, '');
    
    // FORCE HTTPS for localhost:8081 (mkcert enables HTTPS, so we must use HTTPS)
    if (baseUrl.includes('localhost:8081')) {
      baseUrl = baseUrl.replace(/^http:\/\//, 'https://');
      console.log('[Share Route] ⚠️ Forced HTTPS for localhost:8081:', baseUrl);
    }
    
    const shareUrl = `${baseUrl}/#token=${shareToken}`;
    console.log('[Share Route] Final share URL generated:', shareUrl);
    
    console.log('[Share Route] Generated share URL:', shareUrl);

    console.log('[Share Route] Returning share link:', {
      shareUrl,
      token: shareToken.substring(0, 10) + '...',
      expiresAt,
      timestamp: new Date().toISOString()
    });

    // Return share URL immediately - QR code is generated on frontend for instant response
    // This eliminates the 1-3 second delay from backend QR code generation
    res.json({
      shareUrl,
      token: shareToken,
      expiresAt
      // qrCode removed - generated on frontend using qrcode.react for instant display
    });
    
    console.log('[Share Route] Response sent successfully');
    clearTimeout(timeout);
  } catch (error) {
    clearTimeout(timeout);
    console.error('[Share Route] Error in generate:', error);
    if (!res.headersSent) {
      next(error);
    }
  }
});

export default router;


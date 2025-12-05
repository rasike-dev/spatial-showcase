import express from 'express';
import { query } from '../db/connection.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Track analytics event
router.post('/track', optionalAuth, async (req, res, next) => {
  try {
    const { portfolio_id, event_type, event_data, device_type } = req.body;

    if (!portfolio_id || !event_type) {
      return res.status(400).json({ error: 'portfolio_id and event_type are required' });
    }

    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    await query(
      `INSERT INTO analytics_events (portfolio_id, event_type, event_data, user_agent, ip_address, device_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        portfolio_id,
        event_type,
        JSON.stringify(event_data || {}),
        userAgent,
        ipAddress,
        device_type || 'unknown'
      ]
    );

    res.json({ message: 'Event tracked successfully' });
  } catch (error) {
    next(error);
  }
});

// Get analytics for a portfolio
router.get('/portfolio/:portfolioId', authenticateToken, async (req, res, next) => {
  try {
    const { portfolioId } = req.params;

    // Verify ownership
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

    // Get total views
    const viewsResult = await query(
      `SELECT COUNT(*) as total_views
       FROM analytics_events
       WHERE portfolio_id = $1 AND event_type = 'view'`,
      [portfolioId]
    );

    // Get unique visitors (approximate by IP)
    const uniqueVisitorsResult = await query(
      `SELECT COUNT(DISTINCT ip_address) as unique_visitors
       FROM analytics_events
       WHERE portfolio_id = $1 AND event_type = 'view'`,
      [portfolioId]
    );

    // Get average time spent
    const timeSpentResult = await query(
      `SELECT AVG((event_data->>'duration')::numeric) as avg_time_spent
       FROM analytics_events
       WHERE portfolio_id = $1 AND event_type = 'time_spent'`,
      [portfolioId]
    );

    // Get views over time (last 30 days)
    const viewsOverTimeResult = await query(
      `SELECT DATE(created_at) as date, COUNT(*) as views
       FROM analytics_events
       WHERE portfolio_id = $1 
         AND event_type = 'view'
         AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [portfolioId]
    );

    // Get device breakdown
    const deviceBreakdownResult = await query(
      `SELECT device_type, COUNT(*) as count
       FROM analytics_events
       WHERE portfolio_id = $1 AND event_type = 'view'
       GROUP BY device_type`,
      [portfolioId]
    );

    res.json({
      totalViews: parseInt(viewsResult.rows[0].total_views) || 0,
      uniqueVisitors: parseInt(uniqueVisitorsResult.rows[0].unique_visitors) || 0,
      avgTimeSpent: parseFloat(timeSpentResult.rows[0].avg_time_spent) || 0,
      viewsOverTime: viewsOverTimeResult.rows,
      deviceBreakdown: deviceBreakdownResult.rows
    });
  } catch (error) {
    next(error);
  }
});

export default router;


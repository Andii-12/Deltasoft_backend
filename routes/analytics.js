const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');
const { auth } = require('./auth');

// Get visitor statistics
router.get('/visitors', auth, async (req, res) => {
  try {
    const stats = await Visitor.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching visitor stats:', error);
    res.status(500).json({ message: 'Error fetching visitor statistics' });
  }
});

// Get real-time visitor data
router.get('/visitors/realtime', auth, async (req, res) => {
  try {
    const realTimeStats = await Visitor.getRealTimeStats();
    res.json(realTimeStats);
  } catch (error) {
    console.error('Error fetching real-time stats:', error);
    res.status(500).json({ message: 'Error fetching real-time statistics' });
  }
});

// Get visitor analytics with date range
router.get('/visitors/range', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const visitors = await Visitor.find({
      createdAt: { $gte: start, $lte: end }
    }).sort({ createdAt: -1 });

    const stats = {
      totalVisitors: visitors.length,
      uniqueVisitors: await Visitor.distinct('sessionId', {
        createdAt: { $gte: start, $lte: end }
      }).then(ids => ids.length),
      topPages: await Visitor.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$page', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      deviceStats: await Visitor.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$device', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      countryStats: await Visitor.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      hourlyStats: await Visitor.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: {
              hour: { $hour: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.day': 1, '_id.hour': 1 } }
      ])
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching visitor range stats:', error);
    res.status(500).json({ message: 'Error fetching visitor range statistics' });
  }
});

// Get system health status
router.get('/system/health', auth, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const os = require('os');
    
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'Connected' : 'Disconnected';
    
    const systemInfo = {
      database: {
        status: dbStatus,
        state: dbState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      },
      server: {
        uptime: process.uptime(),
        uptimeFormatted: formatUptime(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        loadAverage: os.loadavg()
      },
      timestamp: new Date()
    };

    res.json(systemInfo);
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({ message: 'Error fetching system health' });
  }
});

// Get recent activity
router.get('/activity', auth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const recentVisitors = await Visitor.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('ip page device browser country createdAt sessionId isNewVisitor');

    const activities = recentVisitors.map(visitor => ({
      id: visitor._id,
      type: 'visit',
      title: `${visitor.isNewVisitor ? 'New' : 'Returning'} visitor from ${visitor.country}`,
      subtitle: `Viewed ${visitor.page} on ${visitor.device}`,
      time: visitor.createdAt,
      icon: 'visit',
      color: visitor.isNewVisitor ? 'text-green-500' : 'text-blue-500',
      details: {
        ip: visitor.ip,
        browser: visitor.browser,
        os: visitor.os,
        sessionId: visitor.sessionId
      }
    }));

    res.json(activities);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ message: 'Error fetching recent activity' });
  }
});

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

module.exports = router;

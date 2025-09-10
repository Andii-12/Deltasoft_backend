const Visitor = require('../models/Visitor');
const { v4: uuidv4 } = require('uuid');

// Function to detect device type
const getDeviceType = (userAgent) => {
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const tabletRegex = /iPad|Android(?=.*\bMobile\b)/i;
  
  if (tabletRegex.test(userAgent)) return 'tablet';
  if (mobileRegex.test(userAgent)) return 'mobile';
  return 'desktop';
};

// Function to detect browser
const getBrowser = (userAgent) => {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  return 'Unknown';
};

// Function to detect OS
const getOS = (userAgent) => {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
};

// Function to get client IP
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         '127.0.0.1';
};

// Visitor tracking middleware
const trackVisitor = async (req, res, next) => {
  try {
    // Skip tracking for admin routes and API calls
    if (req.path.startsWith('/admin') || 
        req.path.startsWith('/api') || 
        req.path.startsWith('/worker')) {
      return next();
    }

    // Skip tracking for static assets
    if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      return next();
    }

    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers.referer || '';
    const page = req.path;
    
    // Generate or get session ID
    let sessionId = req.cookies.sessionId;
    if (!sessionId) {
      sessionId = uuidv4();
      res.cookie('sessionId', sessionId, { 
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true 
      });
    }

    // Check if this is a new visitor or returning visitor
    const existingVisitor = await Visitor.findOne({ 
      ip: ip, 
      sessionId: sessionId 
    }).sort({ createdAt: -1 });

    const isNewVisitor = !existingVisitor || 
      (Date.now() - existingVisitor.lastVisit.getTime()) > 30 * 60 * 1000; // 30 minutes

    // Create visitor record
    const visitorData = {
      ip,
      userAgent,
      referer,
      page,
      sessionId,
      device: getDeviceType(userAgent),
      browser: getBrowser(userAgent),
      os: getOS(userAgent),
      isNewVisitor,
      visitCount: isNewVisitor ? 1 : (existingVisitor?.visitCount || 0) + 1,
      lastVisit: new Date()
    };

    // Save visitor data (async, don't wait)
    Visitor.create(visitorData).catch(err => {
      console.error('Error saving visitor data:', err);
    });

    // Add visitor info to request for potential use
    req.visitorInfo = {
      sessionId,
      isNewVisitor,
      device: visitorData.device,
      browser: visitorData.browser,
      os: visitorData.os
    };

    next();
  } catch (error) {
    console.error('Visitor tracking error:', error);
    next(); // Continue even if tracking fails
  }
};

module.exports = trackVisitor;

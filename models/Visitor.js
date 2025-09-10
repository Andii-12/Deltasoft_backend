const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  referer: {
    type: String,
    default: ''
  },
  page: {
    type: String,
    required: true
  },
  country: {
    type: String,
    default: 'Unknown'
  },
  city: {
    type: String,
    default: 'Unknown'
  },
  device: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet'],
    default: 'desktop'
  },
  browser: {
    type: String,
    default: 'Unknown'
  },
  os: {
    type: String,
    default: 'Unknown'
  },
  sessionId: {
    type: String,
    required: true
  },
  isNewVisitor: {
    type: Boolean,
    default: true
  },
  visitCount: {
    type: Number,
    default: 1
  },
  lastVisit: {
    type: Date,
    default: Date.now
  },
  visitDuration: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for better query performance
visitorSchema.index({ createdAt: 1 });
visitorSchema.index({ ip: 1, sessionId: 1 });
visitorSchema.index({ page: 1 });

// Static method to get visitor statistics
visitorSchema.statics.getStats = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - 7);
  
  const thisMonth = new Date(today);
  thisMonth.setMonth(thisMonth.getMonth() - 1);

  const [
    totalVisitors,
    todayVisitors,
    yesterdayVisitors,
    weekVisitors,
    monthVisitors,
    uniqueVisitors,
    topPages,
    deviceStats,
    countryStats
  ] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ createdAt: { $gte: today } }),
    this.countDocuments({ 
      createdAt: { $gte: yesterday, $lt: today } 
    }),
    this.countDocuments({ createdAt: { $gte: thisWeek } }),
    this.countDocuments({ createdAt: { $gte: thisMonth } }),
    this.distinct('sessionId').then(ids => ids.length),
    this.aggregate([
      { $group: { _id: '$page', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),
    this.aggregate([
      { $group: { _id: '$device', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    this.aggregate([
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])
  ]);

  return {
    totalVisitors,
    todayVisitors,
    yesterdayVisitors,
    weekVisitors,
    monthVisitors,
    uniqueVisitors,
    topPages,
    deviceStats,
    countryStats,
    lastUpdated: new Date()
  };
};

// Static method to get real-time visitor count
visitorSchema.statics.getRealTimeStats = async function() {
  const now = new Date();
  const last5Minutes = new Date(now.getTime() - 5 * 60 * 1000);
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
  
  const [
    currentVisitors,
    last5MinVisitors,
    lastHourVisitors
  ] = await Promise.all([
    this.countDocuments({ lastVisit: { $gte: last5Minutes } }),
    this.countDocuments({ createdAt: { $gte: last5Minutes } }),
    this.countDocuments({ createdAt: { $gte: lastHour } })
  ]);

  return {
    currentVisitors,
    last5MinVisitors,
    lastHourVisitors,
    timestamp: now
  };
};

module.exports = mongoose.model('Visitor', visitorSchema);

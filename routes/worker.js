const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Worker = require('../models/Worker');
const TimeEntry = require('../models/TimeEntry');

// Worker login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find worker by username
    const worker = await Worker.findOne({ username });
    if (!worker) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await worker.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create and send token
    const token = jwt.sign(
      { workerId: worker._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Worker login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Middleware to protect worker routes
const workerAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.worker = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Clock in route
router.post('/clock-in', workerAuth, async (req, res) => {
  try {
    const { company } = req.body;
    const timeEntry = new TimeEntry({
      worker: req.worker.workerId,
      clockIn: new Date(),
      company: company || ''
    });
    await timeEntry.save();
    res.json(timeEntry);
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clock out route
router.post('/clock-out', workerAuth, async (req, res) => {
  try {
    const { company } = req.body;
    const timeEntry = await TimeEntry.findOne({
      worker: req.worker.workerId,
      clockOut: null
    });

    if (!timeEntry) {
      return res.status(400).json({ message: 'No active time entry found' });
    }

    timeEntry.clockOut = new Date();
    timeEntry.duration = (timeEntry.clockOut - timeEntry.clockIn) / (1000 * 60 * 60); // Duration in hours
    // Only set company if not already set
    if (!timeEntry.company && company) timeEntry.company = company;
    await timeEntry.save();
    res.json(timeEntry);
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get time entries route
router.get('/time-entries', workerAuth, async (req, res) => {
  try {
    const timeEntries = await TimeEntry.find({ worker: req.worker.workerId })
      .sort({ clockIn: -1 });
    res.json(timeEntries);
  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Middleware to check admin token (simple version)
const adminAuth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  try {
    // In production, verify token and check admin role
    // For now, just check token exists
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Admin: Get all workers
router.get('/', adminAuth, async (req, res) => {
  try {
    const workers = await Worker.find({}, '-password'); // Exclude password
    // Map username to email for frontend compatibility
    const result = workers.map(w => ({
      _id: w._id,
      name: w.name,
      email: w.username,
      schedule: w.schedule || {}
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Create a new worker
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    // Use email as username
    const existing = await Worker.findOne({ username: email });
    if (existing) {
      return res.status(400).json({ message: 'Worker already exists' });
    }
    const worker = new Worker({ name, username: email, password });
    await worker.save();
    res.status(201).json({ _id: worker._id, name: worker.name, email: worker.username });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Update worker password
router.put('/:id/password', adminAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    worker.password = password; // Will be hashed by pre-save hook
    await worker.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Update worker schedule
router.put('/:id/schedule', adminAuth, async (req, res) => {
  try {
    const { schedule } = req.body;
    if (!schedule) {
      return res.status(400).json({ message: 'Schedule is required' });
    }
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    // Ensure worker.schedule is an object
    if (!worker.schedule) worker.schedule = {};
    worker.schedule = {
      ...worker.schedule.toObject?.() || worker.schedule,
      ...schedule
    };
    await worker.save();
    res.json({ message: 'Schedule updated successfully', schedule: worker.schedule });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Worker: Get own info and schedule
router.get('/me', workerAuth, async (req, res) => {
  try {
    const worker = await Worker.findById(req.worker.workerId);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    res.json({
      _id: worker._id,
      name: worker.name,
      username: worker.username,
      schedule: worker.schedule || {}
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all distinct companies (public)
router.get('/companies', async (req, res) => {
  try {
    const companies = await TimeEntry.distinct('company', { company: { $ne: '' } });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch companies' });
  }
});

// Get all companies from all worker schedules (public)
router.get('/schedule-companies', async (req, res) => {
  try {
    const workers = await Worker.find({}, 'schedule');
    const companySet = new Set();
    workers.forEach(worker => {
      const schedule = worker.schedule || {};
      Object.values(schedule).forEach(dayCompanies => {
        if (dayCompanies) {
          dayCompanies.split(',').forEach(company => {
            const trimmed = company.trim();
            if (trimmed) companySet.add(trimmed);
          });
        }
      });
    });
    res.json(Array.from(companySet).sort());
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch companies from schedules' });
  }
});

// Admin: Get all time entries for all workers, grouped by worker
router.get('/all-time-entries', adminAuth, async (req, res) => {
  try {
    const workers = await Worker.find({}, 'name username');
    const entries = await TimeEntry.find({}).sort({ clockIn: -1 });
    // Group entries by worker
    const grouped = workers.map(worker => ({
      worker: { _id: worker._id, name: worker.name, username: worker.username },
      entries: entries.filter(e => e.worker.toString() === worker._id.toString())
    }));
    res.json(grouped);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch time entries' });
  }
});

// Admin: Delete a time entry by ID
router.delete('/time-entry/:id', adminAuth, async (req, res) => {
  try {
    await TimeEntry.findByIdAndDelete(req.params.id);
    res.json({ message: 'Time entry deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete time entry' });
  }
});

// Admin: Delete a worker
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    await worker.deleteOne();
    res.json({ message: 'Worker deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Update a worker
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const worker = await Worker.findById(req.params.id);
    
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Update fields
    worker.name = name;
    worker.username = email; // Using email as username
    worker.role = role;

    await worker.save();
    res.json({ 
      _id: worker._id, 
      name: worker.name, 
      email: worker.username,
      role: worker.role 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 
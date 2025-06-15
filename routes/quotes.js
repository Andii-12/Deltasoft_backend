const express = require('express');
const router = express.Router();
const Quote = require('../models/Quote');
const { auth } = require('./auth');

// Get all quotes (protected route)
router.get('/', auth, async (req, res) => {
  try {
    const quotes = await Quote.find().sort({ date: -1 });
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit a new quote (public route)
router.post('/', async (req, res) => {
  try {
    const { name, company, email, phone, description } = req.body;
    
    const quote = new Quote({
      name,
      company,
      email,
      phone,
      description,
      status: 'pending'
    });

    await quote.save();
    res.status(201).json({ message: 'Үнийн саналын хүсэлт амжилттай илгээгдлээ' });
  } catch (err) {
    console.error('Quote submission error:', err);
    res.status(500).json({ message: 'Үнийн санал илгээхэд алдаа гарлаа' });
  }
});

// Update quote status (protected route)
router.patch('/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const quote = await Quote.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }

    res.json(quote);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update quote status' });
  }
});

// Delete quote (protected route)
router.delete('/:id', auth, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }
    await quote.deleteOne();
    res.json({ message: 'Quote deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete quote' });
  }
});

module.exports = router; 
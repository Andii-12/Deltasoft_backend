const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const News = require('../models/News');
const { auth } = require('./auth');
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// MongoDB connection
const conn = mongoose.connection;
let gfs;
conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Multer GridFS storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Get all news (public)
router.get('/', async (req, res) => {
  try {
    const news = await News.find().sort({ date: -1 });
    res.json(news);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create news with image (protected)
router.post('/', auth, upload.single('image'), async (req, res) => {
  let imageDataUrl = '';
  if (req.file) {
    const mimeType = req.file.mimetype;
    const base64 = fs.readFileSync(req.file.path, { encoding: 'base64' });
    imageDataUrl = `data:${mimeType};base64,${base64}`;
    fs.unlinkSync(req.file.path);
  }

  const news = new News({
    title: req.body.title,
    content: req.body.content,
    status: req.body.status,
    image: imageDataUrl,
    category: req.body.category || 'Мэдээ',
  });

  try {
    const newNews = await news.save();
    res.status(201).json(newNews);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update news with optional image (protected)
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    news.title = req.body.title || news.title;
    news.content = req.body.content || news.content;
    news.status = req.body.status || news.status;
    if (req.body.category) news.category = req.body.category;
    if (req.file) {
      const mimeType = req.file.mimetype;
      const base64 = fs.readFileSync(req.file.path, { encoding: 'base64' });
      news.image = `data:${mimeType};base64,${base64}`;
      fs.unlinkSync(req.file.path);
    }

    const updatedNews = await news.save();
    res.json(updatedNews);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Serve image from GridFS
router.get('/image/:id', async (req, res) => {
  try {
    console.log('Requested image id:', req.params.id);
    const file = await gfs.files.findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
    if (!file) {
      console.log('File not found for id:', req.params.id);
      return res.status(404).json({ message: 'File not found' });
    }
    console.log('File found:', file);

    res.set('Content-Type', file.contentType);
    const readstream = gfs.createReadStream({ _id: file._id });
    readstream.on('error', (err) => {
      console.error('Readstream error:', err);
      res.status(500).json({ message: 'Error streaming file' });
    });
    readstream.pipe(res);
  } catch (err) {
    console.error('Error in image route:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete news (protected)
router.delete('/:id', auth, async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    await news.deleteOne();
    res.json({ message: 'News deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 
const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { auth } = require('./auth');
const axios = require('axios');
const cheerio = require('cheerio');
const multer = require('multer');
const path = require('path');

// Multer setup (reuse from news.js)
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

// Get all projects
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().sort({ date: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// Create project (admin only)
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, icon, link } = req.body;
    if (category === 'web') {
      if (!title || !link) {
        return res.status(400).json({ message: 'Title and link are required for web projects' });
      }
      const project = new Project({ title, link, category, icon: icon || '', description: description || '' });
      await project.save();
      return res.status(201).json(project);
    } else if (category === 'network') {
      if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required' });
      }
      const imageUrl = req.file ? '/uploads/' + req.file.filename : '';
      const project = new Project({ title, description, category, image: imageUrl });
      await project.save();
      return res.status(201).json(project);
    } else {
      if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required' });
      }
      const project = new Project({ title, description, category, icon });
      await project.save();
      return res.status(201).json(project);
    }
  } catch (err) {
    res.status(400).json({ message: 'Failed to create project' });
  }
});

// Update project (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, category, icon } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    project.title = title || project.title;
    project.description = description || project.description;
    project.category = category || project.category;
    project.icon = icon || project.icon;
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update project' });
  }
});

// Delete project (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await project.deleteOne();
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

// Get og:image from a website
router.get('/og-image', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });
  try {
    const { data } = await axios.get(url, { timeout: 5000 });
    const $ = cheerio.load(data);
    const ogImage = $('meta[property="og:image"]').attr('content') ||
                    $('meta[name="twitter:image"]').attr('content');
    if (ogImage) {
      res.json({ image: ogImage });
    } else {
      res.status(404).json({ error: 'No og:image found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

module.exports = router; 
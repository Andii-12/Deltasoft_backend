const express = require('express');
const router = express.Router();
const TeamMember = require('../models/TeamMember');
const { auth } = require('./auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

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

// Get all team members (public)
router.get('/', async (req, res) => {
  try {
    const members = await TeamMember.find();
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a team member (protected)
router.post('/', auth, upload.fields([
  { name: 'normalImage', maxCount: 1 },
  { name: 'animeImage', maxCount: 1 }
]), async (req, res) => {
  let normalImageDataUrl = '';
  let animeImageDataUrl = '';
  if (req.files && req.files['normalImage']) {
    const file = req.files['normalImage'][0];
    const mimeType = file.mimetype;
    const base64 = fs.readFileSync(file.path, { encoding: 'base64' });
    normalImageDataUrl = `data:${mimeType};base64,${base64}`;
    fs.unlinkSync(file.path);
  }
  if (req.files && req.files['animeImage']) {
    const file = req.files['animeImage'][0];
    const mimeType = file.mimetype;
    const base64 = fs.readFileSync(file.path, { encoding: 'base64' });
    animeImageDataUrl = `data:${mimeType};base64,${base64}`;
    fs.unlinkSync(file.path);
  }
  const member = new TeamMember({
    name: req.body.name,
    role: req.body.role,
    normalImage: normalImageDataUrl,
    animeImage: animeImageDataUrl,
  });
  try {
    const newMember = await member.save();
    res.status(201).json(newMember);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a team member (protected)
router.put('/:id', auth, upload.fields([
  { name: 'normalImage', maxCount: 1 },
  { name: 'animeImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const member = await TeamMember.findById(req.params.id);
    if (!member) return res.status(404).json({ message: 'Team member not found' });
    member.name = req.body.name || member.name;
    member.role = req.body.role || member.role;
    if (req.files && req.files['normalImage']) {
      const file = req.files['normalImage'][0];
      const mimeType = file.mimetype;
      const base64 = fs.readFileSync(file.path, { encoding: 'base64' });
      member.normalImage = `data:${mimeType};base64,${base64}`;
      fs.unlinkSync(file.path);
    }
    if (req.files && req.files['animeImage']) {
      const file = req.files['animeImage'][0];
      const mimeType = file.mimetype;
      const base64 = fs.readFileSync(file.path, { encoding: 'base64' });
      member.animeImage = `data:${mimeType};base64,${base64}`;
      fs.unlinkSync(file.path);
    }
    const updatedMember = await member.save();
    res.json(updatedMember);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a team member (protected)
router.delete('/:id', auth, async (req, res) => {
  try {
    const member = await TeamMember.findById(req.params.id);
    if (!member) return res.status(404).json({ message: 'Team member not found' });
    await member.deleteOne();
    res.json({ message: 'Team member deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 
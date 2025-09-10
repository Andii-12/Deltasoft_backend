const express = require('express');
const router = express.Router();
const Logo = require('../models/Logo');
const { auth } = require('./auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/logos');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, SVG) are allowed!'));
    }
  }
});

// Get all logos (admin only)
router.get('/', auth, async (req, res) => {
  try {
    const logos = await Logo.getAllLogos();
    res.json(logos);
  } catch (error) {
    console.error('Error fetching logos:', error);
    res.status(500).json({ message: 'Error fetching logos' });
  }
});

// Get active logos (public)
router.get('/active', async (req, res) => {
  try {
    const logos = await Logo.getActiveLogos();
    res.json(logos);
  } catch (error) {
    console.error('Error fetching active logos:', error);
    res.status(500).json({ message: 'Error fetching active logos' });
  }
});

// Get single logo
router.get('/:id', auth, async (req, res) => {
  try {
    const logo = await Logo.findById(req.params.id);
    if (!logo) {
      return res.status(404).json({ message: 'Logo not found' });
    }
    res.json(logo);
  } catch (error) {
    console.error('Error fetching logo:', error);
    res.status(500).json({ message: 'Error fetching logo' });
  }
});

// Create new logo
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { name } = req.body;
    
    let imageData = '';
    let imageType = 'base64';

    if (req.file) {
      // File upload
      imageData = `/uploads/logos/${req.file.filename}`;
      imageType = 'file';
    } else if (req.body.image) {
      // Base64 upload
      imageData = req.body.image;
      imageType = 'base64';
    } else {
      return res.status(400).json({ message: 'Image is required' });
    }

    const logo = new Logo({
      name,
      image: imageData,
      imageType,
      uploadedBy: req.user.id
    });

    await logo.save();
    res.status(201).json(logo);
  } catch (error) {
    console.error('Error creating logo:', error);
    res.status(500).json({ message: 'Error creating logo' });
  }
});

// Update logo
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const { name, isActive } = req.body;
    
    const logo = await Logo.findById(req.params.id);
    if (!logo) {
      return res.status(404).json({ message: 'Logo not found' });
    }

    // Update fields
    logo.name = name || logo.name;
    logo.isActive = isActive !== undefined ? isActive === 'true' : logo.isActive;

    // Handle image update
    if (req.file) {
      // Delete old file if it exists
      if (logo.imageType === 'file' && logo.image) {
        const oldFilePath = path.join(__dirname, '..', logo.image);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      logo.image = `/uploads/logos/${req.file.filename}`;
      logo.imageType = 'file';
    } else if (req.body.image) {
      // Update base64 image
      logo.image = req.body.image;
      logo.imageType = 'base64';
    }

    await logo.save();
    res.json(logo);
  } catch (error) {
    console.error('Error updating logo:', error);
    res.status(500).json({ message: 'Error updating logo' });
  }
});

// Delete logo
router.delete('/:id', auth, async (req, res) => {
  try {
    const logo = await Logo.findById(req.params.id);
    if (!logo) {
      return res.status(404).json({ message: 'Logo not found' });
    }

    // Delete associated file if it exists
    if (logo.imageType === 'file' && logo.image) {
      const filePath = path.join(__dirname, '..', logo.image);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Logo.findByIdAndDelete(req.params.id);
    res.json({ message: 'Logo deleted successfully' });
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({ message: 'Error deleting logo' });
  }
});

// Toggle logo active status
router.patch('/:id/toggle', auth, async (req, res) => {
  try {
    const logo = await Logo.findById(req.params.id);
    if (!logo) {
      return res.status(404).json({ message: 'Logo not found' });
    }

    logo.isActive = !logo.isActive;
    await logo.save();
    res.json(logo);
  } catch (error) {
    console.error('Error toggling logo status:', error);
    res.status(500).json({ message: 'Error toggling logo status' });
  }
});


module.exports = router;

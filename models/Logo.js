const mongoose = require('mongoose');

const logoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String, // Base64 encoded image or file path
    required: true
  },
  imageType: {
    type: String,
    enum: ['base64', 'file'],
    default: 'base64'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
logoSchema.index({ isActive: 1 });

// Static method to get active logos
logoSchema.statics.getActiveLogos = async function() {
  return this.find({ isActive: true })
    .sort({ createdAt: -1 })
    .select('name image imageType');
};

// Static method to get all logos for admin
logoSchema.statics.getAllLogos = async function() {
  return this.find()
    .sort({ createdAt: -1 })
    .populate('uploadedBy', 'name email')
    .select('name image imageType isActive uploadedBy createdAt');
};

module.exports = mongoose.model('Logo', logoSchema);

const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, enum: ['main', 'web', 'network'], required: true },
  icon: { type: String, default: '' }, // icon name or type
  link: { type: String, default: '' }, // for web projects
  image: { type: String, default: '' }, // for network projects
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema); 
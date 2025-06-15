const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  date: {
    type: Date,
    default: Date.now
  },
  image: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['Онцлох мэдээ', 'Мэдээ'],
    default: 'Мэдээ'
  }
});

module.exports = mongoose.model('News', newsSchema); 
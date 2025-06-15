const mongoose = require('mongoose');

const timeEntrySchema = new mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true
  },
  clockIn: {
    type: Date,
    required: true
  },
  clockOut: {
    type: Date,
    default: null
  },
  duration: {
    type: Number,
    default: null
  },
  company: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('TimeEntry', timeEntrySchema); 
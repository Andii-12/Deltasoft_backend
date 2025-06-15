const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  normalImage: { type: String, default: '' }, // base64 data URL
  animeImage: { type: String, default: '' }, // base64 data URL
});

module.exports = mongoose.model('TeamMember', teamMemberSchema); 
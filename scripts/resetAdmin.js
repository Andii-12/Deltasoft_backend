const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const resetAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/deltasoft');
    
    // Delete existing admin
    await User.deleteOne({ username: 'admin' });
    console.log('Existing admin user deleted');

    // Create new admin user
    const adminUser = new User({
      username: 'admin',
      password: 'admin123'
    });

    await adminUser.save();
    console.log('New admin user created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting admin user:', error);
    process.exit(1);
  }
};

resetAdmin(); 
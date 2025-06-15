const mongoose = require('mongoose');
const Worker = require('../models/Worker');
require('dotenv').config();

const createWorker = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/deltasoft');
    console.log('Connected to MongoDB');

    // Create new worker
    const worker = new Worker({
      username: 'Andii',
      password: 'Andii0817',
      name: 'Andii',
      role: 'worker'
    });

    // Save worker to database
    await worker.save();
    console.log('Worker created successfully:', worker.username);

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error creating worker:', error);
    process.exit(1);
  }
};

createWorker(); 
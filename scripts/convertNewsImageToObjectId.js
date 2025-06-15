const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/deltasoft';
const News = require('../models/News');

async function convertImageToObjectId() {
  await mongoose.connect(uri);
  const newsWithStringImage = await News.find({ image: { $type: 'string', $ne: '' } });
  let updated = 0;
  for (const news of newsWithStringImage) {
    try {
      news.image = mongoose.Types.ObjectId(news.image);
      await news.save();
      updated++;
    } catch (e) {
      console.error(`Failed to convert image for news _id=${news._id}:`, e.message);
    }
  }
  console.log(`Updated ${updated} news documents.`);
  await mongoose.disconnect();
}

convertImageToObjectId(); 
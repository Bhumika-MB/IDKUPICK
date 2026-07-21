const mongoose = require('mongoose');
let retryTimer;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/idkupick';

  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI not set. Using local default URI.');
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Error: ${error.message}`);
    console.warn('Continuing with temporary in-memory data. Retrying MongoDB Atlas in 30 seconds.');
    if (!retryTimer) {
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        connectDB();
      }, 30000);
    }
  }
};

module.exports = connectDB;

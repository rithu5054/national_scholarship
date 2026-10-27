const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scholartrack';

  try {
    // Attempt connecting to configured URI (Atlas or local MongoDB) with a short timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[MongoDB] Connected successfully to ${uri}`);
  } catch (err) {
    console.warn(`[MongoDB] Could not connect to external/local MongoDB: ${err.message}`);
    console.log('[MongoDB] Starting embedded in-memory MongoDB server for development...');
    
    try {
      mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      await mongoose.connect(memUri);
      console.log(`[MongoDB] Connected to MongoMemoryServer at ${memUri}`);
    } catch (memErr) {
      console.error('[MongoDB] Fatal error initializing database:', memErr);
      process.exit(1);
    }
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
};

module.exports = { connectDB, disconnectDB };

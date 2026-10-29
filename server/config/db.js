const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod = null;

const connectDB = async () => {
  const isCustomUri = Boolean(process.env.MONGODB_URI);
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scholartrack';

  try {
    // If a cloud URI (Atlas) is configured, give it sufficient timeout (10s) for TLS handshake.
    // If defaulting to local 127.0.0.1, fail quickly (2s) to initiate in-memory fallback.
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: isCustomUri ? 10000 : 2000,
    });
    console.log(`[MongoDB] Connected successfully to ${uri.startsWith('mongodb+srv://') ? 'MongoDB Atlas' : uri}`);
  } catch (err) {
    if (isCustomUri) {
      console.warn(`[MongoDB] Could not connect to configured MONGODB_URI: ${err.message}`);
    } else {
      console.warn(`[MongoDB] Could not connect to local MongoDB: ${err.message}`);
    }

    console.log('[MongoDB] Starting embedded in-memory MongoDB server fallback...');
    
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

const mongoose = require('mongoose');
const log = require('./logger');

async function connectMongo() {
  const url = process.env.MONGO_URL;
  if (!url) throw new Error('MONGO_URL missing');
  await mongoose.connect(url, { dbName: 'droplater' });
  log.info('Worker Mongo connected');
}

module.exports = { connectMongo };

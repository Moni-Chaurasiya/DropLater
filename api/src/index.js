require("dotenv").config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { connectMongo } = require('./db');
const log = require('./logger');
const auth = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

const limiter = rateLimit({ windowMs: 60 * 1000, max: parseInt(process.env.RATE_LIMIT_PER_MIN || '60', 10) });
app.use(limiter);

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/notes', auth, require('./routes/notes'));

app.use('/', express.static(path.join(__dirname, '../public')));

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await connectMongo();
    app.listen(PORT, () => log.info(`API listening on :${PORT}`));
  } catch (err) {
    log.error({ err }, 'API failed to start');
    process.exit(1);
  }
}

start();

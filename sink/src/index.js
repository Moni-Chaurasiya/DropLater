const express = require('express');
const Redis = require('ioredis');
const pino = require('pino');

const app = express();
const log = pino({ level: process.env.LOG_LEVEL || 'info' });
const redis = new Redis(process.env.REDIS_URL);

app.use(express.json());

app.post('/sink', async (req, res) => {
  const key = req.headers['x-idempotency-key'];
  if (!key) return res.status(400).json({ error: 'Missing X-Idempotency-Key' });

  const set = await redis.set(key, '1', 'NX', 'EX', 86400);
  if (set === null) {
    return res.status(200).json({ ok: true, duplicate: true });
  }

  if (process.env.SINK_FAIL_MODE === '1') {
    log.warn({ body: req.body }, 'Sink configured to fail');
    return res.status(500).json({ error: 'Simulated failure' });
  }

  log.info({ body: req.body }, 'Sink received');
  return res.json({ ok: true });
});

app.get('/health', (req, res) => res.json({ ok: true }));

const port = process.env.SINK_PORT || 4000;
app.listen(port, () => log.info(`Sink listening on :${port}`));

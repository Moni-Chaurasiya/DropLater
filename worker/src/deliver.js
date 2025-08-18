const fetch = require('node-fetch');
const { idempotencyKey } = require('./utils/idempotency');

async function deliverNote(note) {
  const releaseAtIso = new Date(note.releaseAt).toISOString();
  const key = idempotencyKey(note._id.toString(), releaseAtIso);

  const t0 = Date.now();
  try {
    const res = await fetch(note.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Note-Id': note._id.toString(),
        'X-Idempotency-Key': key
      },
      body: JSON.stringify({ id: note._id.toString(), title: note.title, body: note.body, releaseAt: releaseAtIso })
    });

    const ms = Date.now() - t0;
    return { ok: res.ok, statusCode: res.status, ms, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (err) {
    const ms = Date.now() - t0;
    return { ok: false, statusCode: 0, ms, error: err.message };
  }
}

module.exports = { deliverNote };

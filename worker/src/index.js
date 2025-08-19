require("dotenv").config();

const { Worker, Queue } = require('bullmq');
const mongoose = require('mongoose');
const { connectMongo } = require('./db');
const log = require('./logger');
const { deliverNote } = require('./deliver');
const { nextDelay } = require('./backoff');

const AttemptSchema = new mongoose.Schema(
  { at: Date, statusCode: Number, ok: Boolean, error: String },
  { _id: false }
);
const NoteSchema = new mongoose.Schema(
  {
    title: String,
    body: String,
    releaseAt: Date,
    webhookUrl: String,
    status: { type: String, enum: ['pending', 'delivered', 'failed', 'dead'], default: 'pending' },
    attempts: { type: [AttemptSchema], default: [] },
    deliveredAt: { type: Date, default: null }
  },
  { timestamps: true }
);
const Note = mongoose.model('Note', NoteSchema);

const connection = { url: process.env.REDIS_URL };
const queue = new Queue('deliveries', { connection });

async function enqueueDueNotes() {
  const now = new Date();
  const due = await Note.find({ status: 'pending', releaseAt: { $lte: now } })
    .sort({ releaseAt: 1 })
    .limit(50)
    .lean();

  for (const n of due) {
    await queue.add('deliver', { noteId: n._id.toString() }, { jobId: n._id.toString() });
  }
}

async function processJob(job) {
  const noteId = job.data.noteId;
  const note = await Note.findById(noteId);
  if (!note) return;
  if (note.status !== 'pending') return;

  const result = await deliverNote(note);
  note.attempts.push({ at: new Date(), statusCode: result.statusCode, ok: result.ok, error: result.error });

  if (result.ok) {
    note.status = 'delivered';
    note.deliveredAt = new Date();
    await note.save();
    return;
  }

  const tries = note.attempts.length;
  if (tries >= 3) {
    note.status = 'dead';
    await note.save();
    return;
  } else {
    note.status = 'failed';
    await note.save();
    const delay = nextDelay(tries - 1);
    await queue.add('deliver', { noteId: note._id.toString() }, { delay, jobId: note._id.toString() });
  }
}

async function start() {
  await connectMongo();

  const interval = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);
  setInterval(() => {
    enqueueDueNotes().catch((err) => log.error({ err }, 'enqueueDueNotes error'));
  }, interval);

  const worker = new Worker('deliveries', async (job) => { await processJob(job); }, { connection });

  worker.on('completed', (job) => log.info({ jobId: job.id }, 'Job completed'));
  worker.on('failed', (job, err) => log.error({ jobId: job?.id, err }, 'Job failed'));

  log.info('Worker started');
}

start().catch((e) => {
  log.error({ e }, 'Worker crashed at start');
  process.exit(1);
});

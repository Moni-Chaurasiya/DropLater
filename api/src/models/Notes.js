const mongoose = require('mongoose');

const AttemptSchema = new mongoose.Schema(
  {
    at: { type: Date, required: true },
    statusCode: { type: Number },
    ok: { type: Boolean, required: true },
    error: { type: String }
  },
  { _id: false }
);

const NoteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    releaseAt: { type: Date, required: true },
    webhookUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'delivered', 'failed', 'dead'],
      default: 'pending'
    },
    attempts: { type: [AttemptSchema], default: [] },
    deliveredAt: { type: Date, default: null }
  },
  { timestamps: true }
);

NoteSchema.index({ releaseAt: 1 });
NoteSchema.index({ status: 1 });

module.exports = mongoose.model('Note', NoteSchema);

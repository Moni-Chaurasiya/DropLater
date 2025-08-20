
jest.setTimeout(20000); 

const nock = require('nock');
const mongoose = require('mongoose');
const { deliverNote } = require('../../src/deliver');

const AttemptSchema = new mongoose.Schema({ at: Date, statusCode: Number, ok: Boolean, error: String }, { _id: false });
const NoteSchema = new mongoose.Schema({
  title: String,
  body: String,
  releaseAt: Date,
  webhookUrl: String,
  status: String,
  attempts: { type: [AttemptSchema], default: [] },
  deliveredAt: Date
});
const Note = mongoose.model('NoteTest', NoteSchema);

// beforeAll(async () => {
//   const url = process.env.MONGO_URL || 'mongodb://localhost:27017/droplater';
//   await mongoose.connect(url, { dbName: 'droplater' });
// });
beforeAll(async () => {
  const url = process.env.MONGO_URL || 'mongodb://localhost:27017/droplater';
  await mongoose.connect(url, { 
    dbName: 'droplater',
    serverSelectionTimeoutMS: 5000, // fail faster if Mongo isn't running
  });
});

// afterAll(async () => {
//   await mongoose.disconnect();
//   nock.cleanAll();
// });
afterAll(async () => {
  await mongoose.connection.close(true);
  nock.cleanAll();
});


test('deliverNote triggers one HTTP call and returns ok', async () => {
  const note = await Note.create({
    title: 't',
    body: 'b',
    releaseAt: new Date('2020-01-01T00:00:10.000Z'),
    webhookUrl: 'http://localhost:4000/sink',
    status: 'pending'
  });

  const scope = nock('http://localhost:4000').post('/sink').reply(200, { ok: true });

  const res = await deliverNote(note);
  expect(res.ok).toBe(true);
  expect(scope.isDone()).toBe(true);
});

const crypto = require('crypto');
function idempotencyKey(noteId, releaseAtIso) {
  return crypto.createHash('sha256').update(`${noteId}:${releaseAtIso}`).digest('hex');
}
module.exports = { idempotencyKey };

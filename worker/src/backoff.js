const BACKOFFS = [1000, 5000, 25000];
function nextDelay(attempt) {
  return BACKOFFS[Math.min(attempt, BACKOFFS.length - 1)];
}
module.exports = { BACKOFFS, nextDelay };

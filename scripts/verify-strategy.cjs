const assert = require('node:assert/strict');
const core = require('../public/decision.js');

for (const mode of ['beginner', 'advanced']) {
  const distribution = {};
  const winningFeedback = mode === 'beginner' ? 80 : 20;
  function visit(ids, depth) {
    assert(depth <= 7, 'A branch exceeds the seven-guess limit.');
    const suggestion = core.recommend(ids, mode);
    for (const branch of core.group(ids, suggestion.guess, mode)) {
      if (branch.key === winningFeedback) {
        distribution[depth] = (distribution[depth] ?? 0) + branch.ids.length;
      } else {
        visit(branch.ids, depth + 1);
      }
    }
  }
  visit(core.all, 1);
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  const worst = Math.max(...Object.keys(distribution).map(Number));
  assert.equal(total, 840);
  assert.equal(worst, mode === 'beginner' ? 4 : 6);
  console.log(JSON.stringify({ mode, total, worst, distribution }, null, 2));
}

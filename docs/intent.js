// Multinomial naive Bayes over word unigrams + bigrams, Laplace smoothing.
// Trained in the browser from intent_train.js; no network, no model.
(function (root) {
  var STOP = { a:1, an:1, the:1, to:1, for:1, of:1, my:1, me:1, i:1, am:1, is:1, in:1, on:1, this:1, and:1, with:1, at:1, do:1, how:1, our:1, help:1 };

  function tokens(text) {
    var w = String(text).toLowerCase().replace(/[^a-z0-9/ ]+/g, " ").split(/\s+/)
      .filter(function (t) { return t && !STOP[t]; })
      .map(function (t) { return t.length > 4 ? t.replace(/(ing|es|s)$/, "") : t; });
    var out = w.slice();
    for (var i = 0; i + 1 < w.length; i++) out.push(w[i] + "_" + w[i + 1]);
    return out;
  }

  // data: { role: [phrases] }; lexicon (optional): { role: "space separated keywords" },
  // each keyword counted lexWeight times for its role.
  function train(data, lexicon, alpha, lexWeight) {
    alpha = alpha || 1; lexWeight = lexWeight || 2;
    var m = { alpha: alpha, labels: Object.keys(data), counts: {}, totals: {}, prior: {}, vocab: {} };
    var n = 0;
    m.labels.forEach(function (l) { n += data[l].length; });
    m.labels.forEach(function (l) {
      m.counts[l] = {}; m.totals[l] = 0; m.prior[l] = Math.log(data[l].length / n);
      data[l].forEach(function (s) {
        tokens(s).forEach(function (t) { m.counts[l][t] = (m.counts[l][t] || 0) + 1; m.totals[l]++; m.vocab[t] = 1; });
      });
      if (lexicon && lexicon[l]) tokens(lexicon[l]).filter(function (t) { return t.indexOf("_") < 0; }).forEach(function (t) {
        m.counts[l][t] = (m.counts[l][t] || 0) + lexWeight; m.totals[l] += lexWeight; m.vocab[t] = 1;
      });
    });
    m.V = Object.keys(m.vocab).length;
    return m;
  }

  // Returns { label, confidence, known, scores } where scores are posterior probabilities.
  function classify(m, text) {
    var toks = tokens(text), logp = {}, known = toks.filter(function (t) { return m.vocab[t]; }).length;
    m.labels.forEach(function (l) {
      var s = m.prior[l];
      toks.forEach(function (t) { if (m.vocab[t]) s += Math.log(((m.counts[l][t] || 0) + m.alpha) / (m.totals[l] + m.alpha * m.V)); });
      logp[l] = s;
    });
    var max = Math.max.apply(null, m.labels.map(function (l) { return logp[l]; })), z = 0, scores = {};
    m.labels.forEach(function (l) { scores[l] = Math.exp(logp[l] - max); z += scores[l]; });
    var best = m.labels[0];
    m.labels.forEach(function (l) { scores[l] /= z; if (scores[l] > scores[best]) best = l; });
    return { label: best, confidence: scores[best], known: known, scores: scores };
  }

  var api = { tokens: tokens, train: train, classify: classify };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else {
    root.Intent = api;
    if (root.INTENT_TRAIN) root.Intent.model = train(root.INTENT_TRAIN, root.INTENT_LEXICON);
  }
})(this);

const surum = require('../surum.json');

function tanit() {
  return surum.ad + ' ' + surum.surum;
}

module.exports = { tanit };

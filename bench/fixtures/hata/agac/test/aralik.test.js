const assert = require('node:assert');
const { aralik } = require('../src/aralik');

assert.deepStrictEqual(aralik(1, 4), [1, 2, 3, 4]);
assert.deepStrictEqual(aralik(5, 5), [5]);
assert.deepStrictEqual(aralik(4, 1), []);

process.stdout.write('aralik testi gecti\n');

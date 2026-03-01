// Drop-in replacement for deprecated lodash.isequal using Node.js built-in.
// See: https://github.com/lodash/lodash/issues/5765
const { isDeepStrictEqual } = require('node:util');
module.exports = isDeepStrictEqual;

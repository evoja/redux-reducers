'use strict'
try {
    require('../lib/**/*.js',  {mode: 'expand'})
} catch (e) {
    // Do nothing. Looks like we just run in normal mode instead of browserify
}
exports.require = function(path) {
    return require('./' + path)
}

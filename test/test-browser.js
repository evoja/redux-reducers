'use strict';
var nodeunit = require('nodeunit')
var r = require('nodeunit/lib/reporters/browser.js')
window.nodeunit = nodeunit
require('../src/**/*.js',  {mode: 'expand'})
var files = require('./tests/**/*-test.js',  {mode: 'hash'})
nodeunit.reporters.browser = r
nodeunit.reporters.browser.run(files)

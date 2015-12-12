'use strict';
var tl = require('../test-lib.js')
var {createReplacer, createExtractor, actionToNamespace,
     ActionToNamespaceException,
     evAssert, comp
  } = tl.require('utils.js')

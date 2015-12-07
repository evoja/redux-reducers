'use strict';
var tl = require('../test-lib.js')
var {createReplacer, createExtractor, cloneSubState, actionToNamespace,
     ActionToNamespaceException,
     evAssert, comp, namespace
  } = tl.require('utils.js')


exports.test_cloneSubState = function(test) {
  test.deepEqual(
    cloneSubState('a.b', {a: {b: 1, c: 2}, d: {e: 3}}, 100),
    {
      a: {
        b: 100,
        c: 2
      },
      d: {e: 3}
    })

  test.deepEqual(cloneSubState('a.b', {}, 100),{a: {b: 100}})

  test.done()
}

exports.test_namespace = function(test) {
  test.equal(namespace('a.b', {a: {b: 1, c: 2}}, true), 1)

  var obj = {}
  var res = namespace('a.b', obj, true)
  test.equal(typeof res, 'undefined')
  test.deepEqual(obj, {})

  var res2 = namespace('a.b', obj)
  test.equal(typeof res2, 'object')
  test.deepEqual(res2, {})
  test.deepEqual(obj, {a: {b: {}}})
  test.done()
}

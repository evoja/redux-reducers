'use strict';
var tl = require('../test-lib.js')
var {createReplacer, createExtractor, cloneSubState, actionToNamespace,
     ActionToNamespaceException,
     evAssert, comp, namespace
  } = tl.require('utils.js')


exports.test_evAssert = function(test) {
  var A = function(){}
  test.throws(() => evAssert(false, 'hello'), Error, 'must throw Error')
  test.throws(() => evAssert(false, 'hello', A), A, 'must throw A')
  test.doesNotThrow(() => evAssert(true, 'hello'), null, 'must not throw')
  test.done()
}

exports.test_comp = function(test) {
  var sq = x => x * x
  var doub = x => x + x
  var fun = comp(sq, doub, sq)
  test.equal(fun(2), 64)
  test.done()
}

exports.test_namespace = function(test) {
  var obj = {}
  var x = namespace('a.b', obj)
  test.deepEqual(obj, {a:{b:{}}})
  test.strictEqual(obj.a.b, x)

  var y = namespace('a', obj)
  test.strictEqual(y, obj.a)

  var z = namespace('x.y', obj, true)
  test.deepEqual(obj, {a:{b:{}}})
  test.strictEqual(z, undefined)

  test.done()
}

exports.test_cloneSubState = function(test) {
 test.deepEqual({m: 2, n: 1}, cloneSubState('m', {m: 1, n: 1}, 2))
 test.done()
}


exports.test_actionToNamespace = function(test) {
  var aton = actionToNamespace('m.{a}.{b}')
  test.ok(typeof aton == 'function')
  test.deepEqual('m.a1.b1', aton({payload: {a: 'a1', b: 'b1'}}))
  test.done()
}


exports.test_createExtractor = function(test) {
  var extract = createExtractor('a.{b}.c')
  test.equal(extract({a: {m: {c: 5}}}, {payload: {b: 'm'}}), 5)
  test.equal(extract({a: [{c: 3}, {c: 4}]}, {payload: {b: 1}}), 4)

  var same = createExtractor('')
  var obj = {}
  test.strictEqual(same(obj, {}), obj)
  test.done()
}

exports.test_createReplacer = function(test) {
  var rp = createReplacer('m')
  test.deepEqual({m: 2, n: 1}, rp({m: 1, n: 1}, 2, {}))
  var rp2 = createReplacer('m.n')
  test.deepEqual({m: {n: 2}}, rp2({}, 2, {}))

  var rp_componentId = createReplacer('m.{componentId}')
  test.deepEqual({m: {x: 2}}, rp_componentId({}, 2, {payload: {componentId: 'x'}}))
  test.deepEqual({m: {'1': 2}}, rp_componentId({}, 2, {payload: {componentId: 1}}))
  test.throws(() => rp_componentId({}, 2, {}), ActionToNamespaceException)
  test.done()
}

'use strict';
var tl = require('../test-lib.js')
var {createReplacer, createExtractor, actionToNamespace,
     ActionToNamespaceException,
     evAssert, comp
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


exports.test_actionToNamespace = function(test) {
  var aton = actionToNamespace('m.{payload.a.cx.cy}.{payload.b}')
  test.ok(typeof aton == 'function')
  test.strictEqual('m.a1.b1', aton({payload: {a: {cx: {cy: 'a1'}}, b: 'b1'}}))
  test.done()
}

exports.test_actionToNamespace_periods = function(test) {
  var aton = actionToNamespace('m.{payload.a.cx.cy}.{payload.b}')
  test.ok(typeof aton == 'function')
  test.strictEqual('m.a\\.1.b\\.\\\\1', aton({payload: {a: {cx: {cy: 'a.1'}}, b: 'b.\\1'}}))
  test.done()
}

exports.test_createExtractor = function(test) {
  var extract = createExtractor('a.{payload.b}.c')
  test.strictEqual(extract({a: {m: {c: 5}}}, {payload: {b: 'm'}}), 5)
  test.strictEqual(extract({a: [{c: 3}, {c: 4}]}, {payload: {b: 1}}), 4)
  test.strictEqual(extract({a: {'m.': {c: 5}}}, {payload: {b: 'm.'}}), 5)

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

  var rp_componentId = createReplacer('m.{payload.componentId}')
  test.deepEqual({m: {x: 2}}, rp_componentId({}, 2, {payload: {componentId: 'x'}}))
  test.deepEqual({m: {'1': 2}}, rp_componentId({}, 2, {payload: {componentId: 1}}))
  test.deepEqual({m: {'x.': 2}}, rp_componentId({}, 2, {payload: {componentId: 'x.'}}))
  test.deepEqual({m: {'x.\\.': 2}}, rp_componentId({}, 2, {payload: {componentId: 'x.\\.'}}))
  test.strictEqual(2, rp_componentId({}, 2, {payload: {componentId: 'x.\\.'}}).m['x.\\.'])
  test.throws(() => rp_componentId({}, 2, {}), ActionToNamespaceException)

  test.done()
}

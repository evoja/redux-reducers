'use strict'

var tl = require('../test-lib.js')
var {createEvReducer, createReducer, chainReducers,
    createComplexEvReducer, NoFunctionError, NoDefaultStateError,
    wrapEvReducer
  } = tl.require('reducers.js')

exports.test_createComplexEvReducer = function(test) {
  var defaultState = {m: 0, c: [1, 0]}
  var reducer = createComplexEvReducer(defaultState, [
    ['m', 'INC_M', x => x + 1],
    ['c.{payload.a}', ['INC_C', 'INC_M'], x => x + 1],
    ['c.{payload.a}', 'M_PLUS_C', (x, _, state) => x + state.m],
  ])

  test.deepEqual(reducer(undefined, {type: 'SOME_TYPE'}),
    {
      m: 0,
      c: [1, 0]
    })

  test.deepEqual(reducer(undefined, {type: 'INC_M', payload: {a: 0}}),
    {
      m: 1,
      c: [2, 0]
    })
  
  var obj = {m: 100, c: [10, 20]}
  test.deepEqual(reducer(obj, {type: 'INC_C', payload: {a: 1}}),
    {
      m: 100,
      c: [10, 21]
    })
  test.deepEqual(obj, {
      m: 100,
      c: [10, 20]
    }, 'obj must not be changed')
  test.deepEqual(reducer(obj, {type: 'M_PLUS_C', payload: {a: 1}}),
    {
      m: 100,
      c: [10, 120],
    })
  test.deepEqual(obj, {
      m: 100,
      c: [10, 20]
    }, 'obj must not be changed')

  test.done()
}

exports.test_wrapEvReducer = function(test) {
  var defaultState = {m: 5}
  var subreducer = createComplexEvReducer(defaultState, [
    ['m', 'INC_M', x => x + 1],
    ['m', 'X_PLUS_M', (x, _, state) => x + state.branch.x],
  ])

  var reducer = wrapEvReducer('sub.st', subreducer)

  test.deepEqual(reducer(undefined, {type: 'SOME_TYPE'}), {sub: {st: {m: 5}}})
  test.deepEqual(reducer(undefined, {type: 'INC_M'}), {sub: {st: {m: 6}}})
  var obj = {sub: {st: {m: 100}}, branch: {x: 3}}
  var obj2 = reducer(obj, {type: 'INC_M'})
  test.deepEqual(obj2, {sub: {st: {m: 101}}, branch: {x: 3}})
  test.deepEqual(obj, {sub: {st: {m: 100}}, branch: {x: 3}}, 'obj must not be changed')
  test.strictEqual(obj2.branch, obj.branch, 'branch must be the same object')
  var obj3= reducer(obj, {type: 'X_PLUS_M'})
  test.deepEqual(obj3, {sub: {st: {m: 103}}, branch: {x: 3}})
  test.deepEqual(obj, {sub: {st: {m: 100}}, branch: {x: 3}}, 'obj must not be changed')
  test.strictEqual(obj3.branch, obj.branch, 'branch must be the same object')
  test.done()
}

exports.test_chainReducer = function(test) {
  var r1 = createComplexEvReducer({m: 5, k: 10}, [
    ['m', ['INC_M', 'M_PLUS_N'], x => x + 1],
  ])
  var r2 = createComplexEvReducer({n: 50, k: 20}, [
    ['n', ['INC_M', 'DEC_N'], x => x - 1],
  ])
  var r3 = createComplexEvReducer({n: 50, k: 20}, [
    ['n', 'M_PLUS_N', (x, _, state) => state.m + x],
  ])

  var reducer = chainReducers([r1, r2, r3])

  test.deepEqual(reducer(undefined, {type: 'SOME_TYPE'}), {m: 5, n: 50, k: 10})

  var result = reducer(undefined, {type: 'INC_M'})
  test.deepEqual(result, {m: 6, n: 49, k: 10})

  var obj = {m: 5, n: 10}
  test.deepEqual(reducer(obj, {type: 'INC_M'}), {m: 6, n: 9})
  test.deepEqual(obj, {m: 5, n: 10}, 'obj must not be changed')

  test.deepEqual(reducer(obj, {type: 'DEC_N'}), {m: 5, n: 9})
  test.deepEqual(obj, {m: 5, n: 10}, 'obj must not be changed')

  test.deepEqual(reducer(obj, {type: 'M_PLUS_N'}), {m: 6, n: 16})
  test.deepEqual(obj, {m: 5, n: 10}, 'obj must not be changed')

  test.done()
}



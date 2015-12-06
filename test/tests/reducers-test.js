'use strict'

var tl = require('../test-lib.js')
var {createEvReducer, createReducer, chainReducers,
    createComplexEvReducer, NoFunctionError, NoDefaultStateError,
    wrapEvReducer
  } = tl.require('reducers.js')

exports.test_createEvReducer_action_exists = function(test) {
  var rd = createEvReducer({
    types: {
      a: [{
        extractor: (state, action) => state.m,
        replacer: (state, data, action) => {return {...state, m: data}},
        defaultData: 1,
        fun: x => x+1
      }]
    },
    defaultState: {},
    anyType: [{
      extractor: (state, action) => state.n,
      replacer: (state, data, action) => {return {...state, n: data}},
      defaultData: 10,
      fun: x => x*2
    }]
  })
  var state = rd(undefined, {type: 'a'})
  test.deepEqual({m: 2, n: 20}, state)
  test.done()
}

exports.test_createReducer = function(test) {
  var rd = createReducer('m.{payload.x}', 'a', 1, x => x+1)
  test.deepEqual(rd.conf.defaultState, {})
  test.deepEqual(rd.conf.anyType, [])
  test.deepEqual(Object.keys(rd.conf.types), ['a'])
  test.equal(rd.conf.types.a.length, 1)
  var type = rd.conf.types.a[0]
  test.equal(type.defaultData, 1)
  test.equal(type.extractor({m: [1, 2]}, {payload: {x: 1}}), 2)
  test.equal(type.extractor({m: {n: 2}}, {payload: {x: 'n'}}), 2)
  test.deepEqual(type.replacer({}, 10, {payload: {x: 1}}), {m: {'1': 10}})
  test.deepEqual(type.replacer({}, 10, {payload: {x: 'n'}}), {m: {n: 10}})
  test.deepEqual(type.fun(10), 11)
  test.done()
}


exports.test_chainReducers = function(test) {
  var getRd = (expected) => (x) => {
    test.equal(x, expected)
    return x + 1
  }
  test.expect(19)

  var chain = chainReducers([getRd(1), getRd(2), getRd(3), getRd(4)])
  test.equal(chain(1), 5)
  test.equal(chain.isEv, undefined)

  var getEvRd = (expected) =>
    createReducer('', 'a', 0, (x) => {
      test.equal(x, expected)
      return x + 1
    })

  var evChain = chainReducers([getEvRd(1), getEvRd(2), getEvRd(3), getEvRd(4)])
  test.equal(evChain(1, {type: 'a'}), 5)
  test.equal(evChain(1, {type: 'b'}), 1)
  test.equal(evChain.isEv, true)

  var mixChain = chainReducers([getRd(1), getEvRd(2)])
  test.equal(mixChain(1, {type: 'a'}), 3)
  test.equal(mixChain(1, {type: 'b'}), 2)
  test.equal(mixChain.isEv, undefined)

  test.done()
}

exports.test_createComplexEvReducer = function(test) {
  var count = 0;
  var getRd = (expected) => (x) => {
    test.equal(x, expected)
    ++count;
    return x + 1
  }
  var rd = createComplexEvReducer([
    ['{payload.a}', ['a', 'b'], 0, getRd(0)],
    ['{payload.a}', 'a', 0, getRd(1)],
    ['c.{payload.b}', 'b', 0, getRd(0)]
  ])

  test.expect(32)

  var origState = {m: 0, c: [1, 0]}
  var state = {m: 0, c: [1, 0]}
  var result = rd(state, {type: 'a', payload: {a: 'm'}})
  test.deepEqual(state, origState, 'state must not change')
  test.deepEqual(result, {m: 2, c: [1, 0]})
  test.equal(count, 2)

  result = rd(state, {type: 'b', payload: {a: 'm', b: 1}})
  test.deepEqual(state, origState, 'state must not change')
  test.deepEqual(result, {m: 1, c: [1, 1]})
  test.equal(count, 4)

  // test defaults
  result = rd(state, {type: 'a', payload: {a: 'n'}})
  test.deepEqual(state, origState, 'state must not change')
  test.deepEqual(result, {m: 0, n: 2, c: [1, 0]})
  test.equal(count, 6)

  result = rd(state, {type: 'b', payload: {a: 'm', b: 2}})
  test.deepEqual(state, origState, 'state must not change')
  test.deepEqual(result, {m: 1, c: [1, 0, 1]})
  test.equal(count, 8)

  // test not changed
  var result = rd(state, {type: 'c', payload: {a: 'm'}})
  test.strictEqual(result, state, 'state must not change')
  test.equal(count, 8)

  // test defaults
  result = rd(undefined, {type: 'a', payload: {a: 'n'}})
  test.deepEqual(result, {n: 2})
  test.equal(count, 10)

  result = rd(undefined, {type: 'b', payload: {a: 'm', b: 2}})
  test.deepEqual(result, {m: 1, c: {'2': 1}})
  test.equal(count, 12)

  var result = rd(undefined, {type: 'c', payload: {a: 'm'}})
  test.deepEqual(result, {})
  test.equal(count, 12)

  test.done()
}


exports.test_createComplexEvError = function(test) {
  var count = 0;
  var getRd = (expected) => (x) => {
    test.equal(x, expected)
    ++count;
    return x + 1
  }
  test.throws(() => createComplexEvReducer([
      ['{payload.a}', ['a', 'b'], 0, getRd(0)],
      ['{payload.a}', 'a', 0],
      ['c.{payload.b}', 'b', 0, getRd(0)]
    ], NoFunctionError, 'must throw error' ))

  test.doesNotThrow(() => createComplexEvReducer([
      ['{payload.a}', ['a', 'b'], getRd(0)],
      ['{payload.a}', 'a', getRd(0)],
      ['c.{payload.b}', 'b', getRd(0)]
    ], 'must not throw error'))

  test.done()
}

exports.test_createComplexEvReducer_noDefaults = function(test) {
  var count = 0;
  var getRd = (expected) => (x) => {
    if (typeof expected == 'number' && isNaN(expected)) {
      test.ok(isNaN(x), 'x must be NaN but was ' + x)
    } else {
      test.equal(x, expected, 'must be `' + expected + '` but was `' + x + '`')
    }
    ++count;
    return x + 1
  }

  test.expect(38)

  var rd = createComplexEvReducer([
    ['{payload.a}', ['a', 'b'], getRd(0)],
    ['{payload.a}', 'a', getRd(1)],
    ['c.{payload.b}', 'b', getRd(0)]
  ])
  var origState = {m: 0, c: [1, 0]}
  var state = {m: 0, c: [1, 0]}
  var result = rd(state, {type: 'a', payload: {a: 'm'}})
  test.deepEqual(state, origState, 'state must not change')
  test.deepEqual(result, {m: 2, c: [1, 0]})
  test.equal(count, 2)

  result = rd(state, {type: 'b', payload: {a: 'm', b: 1}})
  test.deepEqual(state, origState, 'state must not change')
  test.deepEqual(result, {m: 1, c: [1, 1]})
  test.equal(count, 4)

  // test defaults
  rd = createComplexEvReducer([
    ['{a}', ['a', 'b'], getRd(undefined)],
    ['{a}', 'a', getRd(NaN)],
    ['c.{b}', 'b', getRd(undefined)]
  ])
  result = rd(state, {type: 'a', a: 'n'})
  test.deepEqual(state, origState, 'state must not change')
  test.ok(isNaN(result.n), 'result.n must be NaN but was ' + result.n)
  result.n = 0
  test.deepEqual(result, {m: 0, n: 0, c: [1, 0]})
  test.equal(count, 6)

  result = rd(state, {type: 'b', a: 'n', b: 2})
  test.deepEqual(state, origState, 'state must not change')
  test.ok(isNaN(result.n), 'result.n must be NaN but was ' + result.n)
  result.n = 0
  test.ok(isNaN(result.c[2]), 'result.c[2] must be NaN but was ' + result.c[2])
  result.c[2] = 0
  test.deepEqual(result, {m: 0, n: 0, c: [1, 0, 0]})
  test.equal(count, 8)

  // test not changed
  var result = rd(state, {type: 'c', a: 'm'})
  test.strictEqual(result, state, 'state must not change')
  test.equal(count, 8)

  // test defaults
  result = rd(undefined, {type: 'a', a: 'n'})
  test.ok(isNaN(result.n), 'result.n must be NaN but was ' + result.n)
  result.n = 0
  test.deepEqual(result, {n: 0})
  test.equal(count, 10)

  result = rd(undefined, {type: 'b', a: 'n', b: 2})
  test.ok(isNaN(result.n), 'result.n must be NaN but was ' + result.n)
  result.n = 0
  test.ok(isNaN(result.c[2]), 'result.c[2] must be NaN but was ' + result.c[2])
  result.c[2] = 0
  test.deepEqual(result, {n: 0, c: {'2': 0}})
  test.equal(count, 12)

  var result = rd(undefined, {type: 'c', a: 'm'})
  test.deepEqual(result, {})
  test.equal(count, 12)

  test.done()
}

exports.test_createComplexEvReducer_bigDefault = function(test) {
  var count = 0;
  var getRd = (expected) => (x) => {
    if (typeof expected == 'number' && isNaN(expected)) {
      test.ok(isNaN(x), 'x must be NaN but was ' + x)
    } else {
      test.equal(x, expected, 'must be `' + expected + '` but was `' + x + '`')
    }
    ++count;
    return x + 1
  }

  test.expect(28)
  var origState = {m: 0, c: [1, 0]}
  var defaultState = {m: 0, c: [1, 0]}
  var rd = createComplexEvReducer(defaultState, [
      ['{payload.a}', ['a', 'b'], getRd(0)],
      ['{payload.a}', 'a', getRd(1)],
      ['c.{payload.b}', 'b', getRd(0)],
      ['', 'd', (st, action) => {return {...st, x: 10}}]
    ])
  var result = rd(undefined, {type: 'a', payload: {a: 'm'}})
  test.deepEqual(defaultState, origState, 'state must not change')
  test.deepEqual(result, {m: 2, c: [1, 0]})
  test.equal(count, 2)

  result = rd(undefined, {type: 'b', payload: {a: 'm', b: 1}})
  test.deepEqual(defaultState, origState, 'state must not change')
  test.deepEqual(result, {m: 1, c: [1, 1]})
  test.equal(count, 4)

  result = rd(undefined, {type: 'd'})
  test.deepEqual(defaultState, origState, 'state must not change')
  test.deepEqual(result, {m: 0, c: [1, 0], x: 10})

  // test defaults
  rd = createComplexEvReducer(defaultState, [
      ['{a}', ['a', 'b'], getRd(undefined)],
      ['{a}', 'a', getRd(NaN)],
      ['c.{b}', 'b', getRd(undefined)]
    ])
  result = rd(undefined, {type: 'a', a: 'n'})
  test.deepEqual(defaultState, origState, 'state must not change')
  test.ok(isNaN(result.n), 'result.n must be NaN but was ' + result.n)
  result.n = 0
  test.deepEqual(result, {m: 0, n: 0, c: [1, 0]})
  test.equal(count, 6)

  result = rd(undefined, {type: 'b', a: 'n', b: 2})
  test.deepEqual(defaultState, origState, 'state must not change')
  test.ok(isNaN(result.n), 'result.n must be NaN but was ' + result.n)
  result.n = 0
  test.ok(isNaN(result.c[2]), 'result.c[2] must be NaN but was ' + result.c[2])
  result.c[2] = 0
  test.deepEqual(result, {m: 0, n: 0, c: [1, 0, 0]})
  test.equal(count, 8)

  // test not changed
  var result = rd(undefined, {type: 'c', a: 'm'})
  test.deepEqual(defaultState, origState, 'state must not change')
  test.strictEqual(result, defaultState, 'state must be default')
  test.equal(count, 8)

  test.done()
}



exports.test_wrapEvReducer = function(test) {
  var count = 0;
  var countExt = 0;
  var countRep = 0;
  var fun = (x) => {
    ++count;
    test.ok(1)
    return x + 1
  }

  var origState = {c: 2}
  var state = {c: 2}

  test.expect(40)

  var rd = createReducer('a.b', 'a', 0, fun)
  test.deepEqual(rd(undefined, {type: 'a'}), {a: {b: 1}})
  test.equal(count, 1)
  test.deepEqual(rd(undefined, {type: 'b'}), {a: {b: 0}})
  test.equal(count, 1)
  test.deepEqual(rd(state, {type: 'a'}), {a: {b: 1}, c: 2})
  test.equal(count, 2)
  test.deepEqual(rd(state, {type: 'b'}), {c: 2})
  test.equal(count, 2)

  var wrd = wrapEvReducer('x.y', rd)
  test.deepEqual(wrd(undefined, {type: 'a'}), {x: {y: {a: {b: 1}}}})
  test.equal(count, 3)
  test.deepEqual(wrd(undefined, {type: 'b'}), {x: {y: {a: {b: 0}}}})
  test.equal(count, 3)
  test.deepEqual(wrd(state, {type: 'a'}), {x: {y: {a: {b: 1}}}, c: 2})
  test.equal(count, 4)
  test.deepEqual(wrd(state, {type: 'b'}), {c: 2})
  test.equal(count, 4)

  var ext = (st) => {
    ++countExt
    return st && st.x && st.x.y
  }
  var rep = (st, data) => {
    ++countRep
    st = {...st}
    st.x = {...st.x, y: data}
    return st
  }
  var wwrd = wrapEvReducer([ext, rep], rd)
  test.equal(countExt, 0)
  test.equal(countRep, 1)

  test.deepEqual(wwrd(undefined, {type: 'a'}), {x: {y: {a: {b: 1}}}})
  test.equal(countExt, 2)
  test.equal(countRep, 2)
  test.equal(count, 5)

  // Test it does not call extractor and replacer
  test.deepEqual(wwrd(undefined, {type: 'b'}), {x: {y: {a: {b: 0}}}})
  test.equal(countExt, 2)
  test.equal(countRep, 2)
  test.equal(count, 5)

  test.deepEqual(wwrd(state, {type: 'a'}), {x: {y: {a: {b: 1}}}, c: 2})
  test.equal(countExt, 4)
  test.equal(countRep, 3)
  test.equal(count, 6)

  // Test it does not call extractor and replacer
  test.deepEqual(wrd(state, {type: 'b'}), {c: 2})
  test.equal(countExt, 4)
  test.equal(countRep, 3)
  test.equal(count, 6)

  test.done()
}





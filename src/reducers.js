'use strict'
//====== Reducers ========
// What is it:
// * [en](http://rackt.org/redux/docs/basics/Reducers.html)
// * [ru](https://github.com/rajdee/redux-in-russian/blob/master/docs/basics/Reducers.md)

var me = module.exports;
var {evAssert, createExtractor, createReplacer,
    ActionToNamespaceException
  } = require('./utils.js')






me.NoDefaultStateError = function NoDefaultStateError(message) {
  Error.apply(this, arguments)
}

/**
 * Create a reducer which:
 * * extracts sub-object data from state and passes to your functions
 * * does not call your function if action type does not correspond,
 * * on non-corresponding action it just returns the non-changed state.
 *
 * Config:
 * {
 *   types: {
 *     type1: [{extractor1, replacer1, defaultData1, fun1}],
 *   },
 *   defaultState: someObj,
 *   anyType: [{extractor2, replacer2, defaultData2, fun2}]
 * }
 */
me.createEvReducer = function(conf) {
  var {types, defaultState, anyType} = conf
  evAssert(defaultState !== undefined,
    '`defaultState` must not be undefined: ' + defaultState, me.NoDefaultStateError)
  evAssert(typeof types == 'object', '`types` must be an object: ' + types)

  function evReducer(state, action) {
    if (state === undefined) {
      state = defaultState
    }
    var t = types[action.type] || []
    if (anyType) {
      t = t.concat(anyType)
    }
    return t.reduce(
      function(st, {extractor, replacer, defaultData, fun}) {
        var data = st
        try {
          data = extractor(data, action)
          if (data === undefined) {
            data = defaultData
          }
          data = fun(data, action)
          data = replacer(st, data, action)
        } catch (e) {
          if (e instanceof ActionToNamespaceException) {
            return st
          } else {
            throw Error('Error reducing' + e, e)
          }
        }
        return data
      }, state)
  }
  evReducer.conf = conf
  evReducer.isEv = true
  return evReducer
}










function getExtrep(extrep) {
  if (typeof extrep == 'string') {
    extrep = [createExtractor(extrep), createReplacer(extrep)]
  }
  var extractor, replacer;
  if (Array.isArray(extrep)) {
    var [extractor, replacer] = extrep
    extrep = {extractor, replacer}
  }
  return extrep;
}


function wrapDefaultState(replacer, defaultData) {
  try {
    return replacer({}, defaultData, {})
  } catch (e) {
    if (e instanceof ActionToNamespaceException) {
      return {}
    }
    throw Error('Error wrapping default ' + e, e)
  }
}

/**
 * Create a reducer which:
 * * extracts sub-object data from state and passes to your function
 * * if data were undefined it substitutes defaultData.
 * * does not call your function if action type does not correspond,
 * * on non-corresponding action it just returns the non-changed state
 *   or the state with default data.
 *
 * Parameters:
 * * extrep:
 *     * string. if it is empty, fun works with full state.
 *     * [extractor, replacer]. `extractor` and `replacer` are funs.
 *     * {extractor: fun, replacer: fun}
 * * actionTypes: may not be empty.
 *     * string means single type,
 *     * array of types [type1, type2],
 * * defaultData: may not be undefined,
 * * fun: main body of reducer. It may be sure that it gets non-undefined data,
 */
me.createReducer = (extrep, actionTypes, defaultData, fun) => {

  if (typeof actionTypes == 'string') {
    actionTypes = [actionTypes]
  }
  evAssert(Array.isArray(actionTypes), '`actioinTypes` must be an array: ' + actionTypes)
  var {extractor, replacer} = getExtrep(extrep);
  var types, anyType;
  if (actionTypes.length == 0) {
    anyType = [{extractor, replacer, defaultData, fun}]
    types = {}
  } else {
    anyType = [];
    types = actionTypes
      .reduce(
        (ts, type) => (ts[type] = [{extractor, replacer, defaultData, fun}], ts),
        {})
  }

  var defaultState;
  try {
    defaultState = wrapDefaultState(replacer, defaultData)
  } catch (e) {
    if (e instanceof ActionToNamespaceException) {
      defaultState = {}
    } else {
      throw e
    }
  }
  return me.createEvReducer({types, defaultState, anyType})
}










/**
 * Combine array of reducers
 */
me.chainReducers = function chainReducers(reducers) {
  return function chainReducer(state, action) {
    return reducers.reduce((st, reducer) => reducer(st, action), state)
  }
}


















/**
 * Combine array of evReducers
 */
me.chainEvReducers = function chainEvReducers(reducers, defaultState) {
  evAssert(Array.isArray(reducers), '`reducers` must be an array: ' + reducers)

  var conf = {
    defaultState: defaultState !== undefined ? defaultState
      : reducers.length > 0 ? reducers[0].conf.defaultState
      : {},
    types: {},
    anyType: []
  }
  reducers.forEach(function({conf: {types, anyType}}) {
    for (var type in types) {
      conf.types[type] = conf.types[type]
        ? conf.types[type].concat(types[type])
        : types[type]
    }
    conf.anyType = conf.anyType.concat(anyType)
  })

  return me.createEvReducer(conf)
}


me.NoFunctionError = function(message) {
  Error.apply(this, arguments)
}

function throwNoFunctionError(message) {
  throw new me.NoFunctionError(message)
}
/**
 * Config if arguments.length == 1:
 * [[extrep1, actionTypes1, defaultData1, fun1],
 *  [extrep2, actionTypes2, defaultData2, fun2]]
 *
 * Parameters:
 * * extrep:
 *     * string. if it is empty, fun works with full state.
 *     * [extractor, replacer]. `extractor` and `replacer` are funs.
 *     * {extractor: fun, replacer: fun}
 * * actionTypes: may not be empty.
 *     * string means single type,
 *     * array of types [type1, type2],
 *
 *
 *
 * Two arguments way: (defaultState, confArr)
 * Config if arguments.length == 2
 * [[extrep1, actionTypes1, fun1, defaultData1],
 *  [extrep2, actionTypes2, fun2, defaultData2]]
 */
me.createComplexEvReducer = function createComplexReducer() {
  var [a0, a1] = arguments;
  var [defaultState, confArr] =
      arguments.length == 1 ? [undefined, a0]  // createComplexReducer(confArr)
    : Array.isArray(a0) && !Array.isArray(a1) ? [a1, a0] // createComplexReducer(confArr, defaultState)
    : [a0, a1] // createComplexReducer(defaultState, confArr)
  var reducers = confArr.map(
    function ([extrep, actionTypes, a2, a3], i) {
      var [fun, defaultData] =
          typeof a2 == 'function' ? [a2, a3]
        : typeof a3 == 'function' ? [a3, a2]
        : throwNoFunctionError(i + 'th config does not contain function', arguments[0])
      return me.createReducer(extrep, actionTypes, defaultData, fun)
    })
  return me.chainEvReducers(reducers, defaultState)
}













/**
 * Wraps evReducer to deeper version.
 *
 * Parameters:
 * * extrep:
 *     * string. if it is empty, fun works with full state.
 *     * [extractor, replacer]. `extractor` and `replacer` are funs.
 *     * {extractor: fun, replacer: fun}
 * * reducer: evReducer
 */
me.wrapEvReducer = function(extrep, reducer) {
  extrep = getExtrep(extrep)
  var ext = extrep.extractor
  var rep = extrep.replacer
  var wrap = ({extractor, replacer, defaultData, fun}) => {
      var newExtr = (state, action) => extractor(ext(state, action), action)
      var newRepl = (state, data, action) =>
        rep(state, replacer(ext(state, action), data, action), action)
      return {
        extractor: newExtr,
        replacer: newRepl,
        defaultData,
        fun
      }
    }

  var rconf = reducer.conf
  var conf = {}
  conf.defaultState = wrapDefaultState(rep, rconf.defaultState)
  conf.types = {}
  for (var type in rconf.types) {
    conf.types[type] = rconf.types[type].map(wrap)
  }
  conf.anyType = rconf.anyType.map(wrap)
  return me.createEvReducer(conf)
}


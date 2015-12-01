'use strict'
var {wrapEvReducer, createComplexEvReducer, chainReducers} = require('./reducers.js')
var {namespace, cloneSubState} = require('./utils.js')
module.exports = {
    wrapEvReducer, createComplexEvReducer, chainReducers,
    namespace, cloneSubState}

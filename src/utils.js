'use strict';
var me = module.exports
var {access, namespace, assign} = require('@evoja/ns-plain')

/**
 * A quick way to throw message if condition is incorrect
 */
me.evAssert = function evAssert(isTrue, message, Constuctor = Error) {
  if (!isTrue) {
    throw new Constuctor(message);
  }
};

/**
 * Composition of functions
 */
me.comp = function(...funs) {
  return function (...args) {
    return Array.prototype.reduce.call(
      funs,
      (prev, fun) => [fun.apply(this, prev)],
      args)[0]
  }
}

me.ActionToNamespaceException = function ActionToNamespaceException(message, action, template) {
  Error.apply(this, arguments)
}

me.actionToNamespace = (template) => (action) => {
  return (template.match(/\{\w+(?:\.\w+)*\}/g) || []) // => ['{a}, {b.c}']
    .map(me.comp(
        (str) => str.substring(1, str.length -1), // => ['a', 'b.c']
        (name) => ['{' + name + '}', access(name, action)] // => [['{a}', action.a], ['{b.c}', action.b.c]]
      )) 
    .reduce(function(tpl, [ptr, val]) {
        if (typeof val != 'string' && typeof val != 'number') {
         throw new me.ActionToNamespaceException('action does not match to template ' + action + ', ' + template)
        }
        return tpl.replace(new RegExp(ptr, 'g'), val)
      },
      template)

}

me.createExtractor = (template) => {
  if (template == '') {
    return (state, action) => state
  }
  var namespacer = me.actionToNamespace(template);
  return (state, action) => access(namespacer(action), state)
}

me.createReplacer = (template) => {
  if (template == '') {
    return (state, data, action) => data
  }
  var namespacer = me.actionToNamespace(template)
  return (state, data, action) => assign(namespacer(action), state, data)
}


'use strict';
var me = module.exports
var {access, namespace, assign, escapeKey} = require('@evoja/ns-plain')

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

/**
 * Gets the template like "a.b.{y}.d.{x}" and action like {x: 10, y: 'hello'}.
 * Returns the namespace by substitution `{...}` fields with values from the action.
 * Example return: "a.b.hello.d.10"
 * 
 * Actually this is an action extractor.
 */
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
        if (typeof val == 'string') {
          val = escapeKey(val)
        }
        return tpl.replace(new RegExp(ptr, 'g'), val)
      },
      template)

}

/**
 * Creates action extractor.
 * Gets the template like "a.b.{x}".
 * Returns the method: (action) => namespace
 */
me.createExtractor = (template) => {
  if (template == '') {
    return (state, action) => state
  }
  var namespacer = me.actionToNamespace(template);
  return (state, action) => access(namespacer(action), state)
}

/**
 * Creates state replacer.
 * Gets the template like "a.b.{x}".
 * Returns the method (state, data, action) => new_state
 *
 * Example:
 *   var replacer = createReplacer('{x}');
 *   var state = {a: 10, b: 20}
 *   var data = 1
 *   var action1 = {x: 'a'}
 *   var action2 = {x: 'b'}
 *   var state1 = replacer(state, data, action1) // {a: 1, b: 20}
 *   var state2 = replacer(state, data, action2) // {a: 10, b: 1}
 *
 */
me.createReplacer = (template) => {
  if (template == '') {
    return (state, data, action) => data
  }
  var namespacer = me.actionToNamespace(template)
  return (state, data, action) => assign(namespacer(action), state, data)
}


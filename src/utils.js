'use strict';
var me = module.exports;

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

me.namespace = function(name, context, doNotCreate) {
  var prevIndex = 0;
  var nextIndex = name.indexOf('.', 0);
  var parent = context || (typeof window !== 'undefined' ? window : global);

  do
  {
    if (!parent) {
      return undefined;
    }

    nextIndex = name.indexOf('.', prevIndex);
    var key = nextIndex >= 0
      ? name.substring(prevIndex, nextIndex)
      : name.substring(prevIndex);

    if ((parent[key] === undefined || parent[key] === null) && !doNotCreate) {
      parent[key] = {};
    }
    parent = parent[key];
    prevIndex = nextIndex + 1;
  } while(nextIndex >= 0);
  return parent;
}

/**
 * Readonly replace some deep field in object by making necessary copies.
 *
 * TODO: It's worth using of some immutable js library.
 */
me.cloneSubState = function cloneSubState(name, parent, value) {
  name = typeof name == 'string' ? name : '' + name
  var dotIndex = name.indexOf('.')
  var field = dotIndex < 0 ? name : name.substring(0, dotIndex)
  var replacedValue = parent && parent[field]
  var replacingValue = dotIndex < 0
    ? value
    : cloneSubState(name.substring(dotIndex + 1), replacedValue, value)

    if (replacingValue === replacedValue) {
        return parent;
    } else {
        var clone = Array.isArray(parent) ? parent.slice() : {...parent};
        clone[field] = replacingValue;
        return clone;
    }
};

me.ActionToNamespaceException = function ActionToNamespaceException(message, action, template) {
  Error.apply(this, arguments)
}

me.actionToNamespace = (template) => ({payload}) => {
  return (template.match(/\{\w+\}/g) || []) // => ['{a}, {b.c}']
    .map(me.comp(
        (str) => str.substring(1, str.length -1), // => ['a', 'b.c']
        (name) => ['{' + name + '}', me.namespace(name, payload, true)] // => [['{a}', payload.a], ['{b.c}', payload.b.c]]
      )) 
    .reduce(function(tpl, [ptr, val]) {
        if (typeof val != 'string' && typeof val != 'number') {
         throw new me.ActionToNamespaceException('action does not match to template ' + payload + ', ' + template)
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
  return (state, action) => me.namespace(namespacer(action), state, true)
}

me.createReplacer = (template) => {
  if (template == '') {
    return (state, data, action) => data
  }
  var namespacer = me.actionToNamespace(template)
  return (state, data, action) => me.cloneSubState(namespacer(action), state, data)
}


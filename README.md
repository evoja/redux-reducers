# redux-reducers [![npm version](https://badge.fury.io/js/%40evoja%2Fredux-reducers.svg)](https://badge.fury.io/js/%40evoja%2Fredux-reducers) [![Build Status](https://travis-ci.org/evoja/redux-reducers.png)](https://travis-ci.org/evoja/redux-reducers)


### createComplexEvReducer
The function creates a reducer consisted of subreducers.
The ubreducer is called only when type of the action matches to declaration.
It extracts substate of the state and passes the subobject to the subreducer.

#### Parameters
`createComplexEvReducer(default_state, array_of_declarations)`

Every declaration in array is an array:
`[path_to_substate, types, subreducer]`

**path_to_substate.** String of zero or more parts separated by periods: `'part1.part2.part3`.

* If the part is an alphanumberic string it's just a key of subobject in the state.
* If the part is wrapped by braces `{value.from.action}` then it's a parameter. Value of parameter comes from the action.

**types.** String or array of strings. Set of action types when subreducer must be called.

**subreducer.** Function(substate, action).

#### Examples

```js
var defaultState = {m: 5, c: [1, 0]}
var reducer = createComplexEvReducer(defaultState, [
  ['m', 'INC_M', x => x + 1],
  ['c.{payload.a}', ['INC_C', 'INC_M'], x => x + 1]
])

reducer(undefined, {type: 'SOME_TYPE'})
// => {
//   m: 5,
//   c: [1, 0]
// }

reducer(undefined, {type: 'INC_M', payload: {a: 0}})
// => {
//   m: 6,
//   c: [2, 0]
// }

reducer({m: 100, c: [10, 20]}, {type: 'INC_C', payload: {a: 1}})
// => {
//   m: 100,
//   c: [10, 21]
// }



### wrapEvReducer
Wraps reducer processing substate into reducer processing parent state.

#### Parameters
`wrapEvReducer(path_to_substate, ev_reducer)`

**path_to_substate.** String of zero or more parts separated by periods: `'part1.part2.part3`. Parts must be alphanumeric strings.

**ev_reducer.** Function(substate, action). Reducer must be _ev_reducer_ created by the `createComplexEvReducer` function or already wrapped by `wrapEvReducer`.


#### Examples

```js
var defaultState = {m: 5}
var subreducer = createComplexEvReducer(defaultState, [
  ['m', 'INC_M', x => x + 1],
])

var reducer = wrapEvReducer('sub.st', subreducer)

reducer(undefined, {type: 'SOME_TYPE'})
// => {sub: {st: {m: 5}}}

reducer(undefined, {type: 'INC_M'})
// => {sub: {st: {m: 6}}}

reducer({sub: {st: {m: 100}}}, {type: 'INC_M'})
// => {sub: {st: {m: 101}}}
```


### chainReducers
`chainReducers(array_of_reducers)`
Takes an array of reducers and returns a combination of every reducer in the array. If every reducer in the array is an _ev_reducer_ it return the _ev_reducer_.
That means it call only necessary subreducers matching type of the action.

#### Examples

```js
var r1 = createComplexEvReducer({m: 5, k: 10}, [
  ['m', 'INC_M', x => x + 1],
])
var r2 = createComplexEvReducer({n: 50, k: 20}, [
  ['n', ['INC_M', 'DEC_N'], x => x - 1],
])

var reducer = chainReducers([r1, r2])

reducer(undefined, {type: 'SOME_TYPE'})
// => {m: 5, n: 50, k: 10}

reducer(undefined, {type: 'INC_M'})
// => {m: 6, n: 49, k: 10}

reducer({m: 5, n: 10}, {type: 'INC_M'})
// => {m: 6, n: 9}

reducer({m: 5, n: 10}, {type: 'DEC_M'})
// => {m: 5, n: 9}
```





### cloneSubState
`cloneSubState(path_to_substate, state, value)`

Clones state and replaces deep value by new one. Keeps all other fields the same.
It clones every sub object in the path and just makes a link of any sub-object 
out of the path, does not do deeply copies of everything.

Complexity is O(N1+N2+...+Nk) where Ni is number of keys on every level of the path. In future we are going to support immutable-js.

#### Examples
```js
cloneSubState('a.b', {a: {b: 1, c: 2}, d: {e: 3}}, 100)
// => {
//   a: {
//     b: 100,
//     c: 2
//   },
//   d: {e: 3}
// }

cloneSubState('a.b', {}, 100)
// => {a: {b: 100}}
```

### namespace
`namespace(path_to_substate, state, doNotCreate)`

Extracts the substate.

* If `doNotCreate` is `false` or `undefined` it modifies state and
creates deep object with chain of all subobjects.
* If `doNotCreate` is `true` it does not create any subobject.

#### Examples
```js
namespace('a.b', {a: {b: 1, c: 2}}, true)
// => 1

var obj = {}
namespace('a.b', obj, true)
// => undefined, obj = {}

namespace('a.b', obj)
// => {}, obj = {a: {b: {}}}
```

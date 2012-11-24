Calcium is another Javascript/MVC bicycle. It heavily inspired by 
Backbone.js but, in contrast, has the following objectives:

* Avoid overbloated "god" objects.
* Minimal memory usage. Using RISK-like architecture.
* Completely predictable behavior.
* Browser-first. Support for node.js only if it does not interfere.

# Namespace and subclassing

All Calcium located inside `Ca` namespace.

Calcium uses Backbone-like mechanizm for subclassing objects. For convenience 
`extend` available in `Ca` namespace.

```javascript
var MyObj = {}
MyObj.extend = Ca.extend;
var MySubObj = MyObj.extend({ ... });
```

# Evented objects

`Ca.Events` is a module that can be mixed in to any object, giving the object 
ability to bind and trigger custom named events.
 
```javascript
var myEvented = _.extend({}, Ca.Events);
var handler = function(sender, message){
  console.log(message);
});
myEvented.on('message', handler);
myEvented.emit('message', 'Hi!');
// > Hi!
```

## Binding and unbinding

Use `on()` and `off()` to bind or unbind callbacks.

```javascript
on(events, callback, [context], [dispose])
off(events, [callback], [context])
```

`on()` binds a callback function to an object. The callback will be invoked 
whenever the event is fired. The `events` string may also be a space-delimited 
list of several events. All callbacks will be executed in FIFO order.

To supply a `context` value for this when the callback is invoked, pass the 
optional third argument. If `context` provided and it evented too, use 
`dispose` flag to automatically turn-off all `context` events for `this` then 
`context` emit "dispose" event. Do not bind anything to "dispose" event. 

```javascript
myEvented.on('event', handler, eventedToo, true);
myEvented.on('dispose', handler, eventedToo);
myEvented.emit('event', 'Hi!');
// > Hi!
eventedToo.dispose();
myEvented.emit('event', 'Noop');
// nothing
``` 

`off()` removes a previously-bound `callback` function from an object. If no 
`context` is specified, all of the versions of the `callback` with different 
contexts will be removed. If no `callback` is specified, all callbacks for the 
`event` will be removed. If no `event` is specified, all event callbacks on 
the object will be removed.

```javascript
myEvented.on('event', handler, eventedToo);

// Removes `handler` callback for all `contexts`
myEvented.off('event', handler);

// Removes all callbacks for "event"
myEvented.off('event');

// Removes `handler` callback for all events
myEvented.off(null, handler);

// Removes all callbacks for `eventedToo` context
myEvented.off(null, null, eventedToo);

// Armageddon! Removes all callbacks for `myEvented`
myEvented.off();
``` 

## Triggering

```javascript
emit(events, [args])
```
    
`emit()` triggers all callbacks for `events`. Callbacks will be triggered with 
sender as first argument and `args`.

```javascript
myEvented.on('one two', handler);
myEvented.emit('two one', "Hi!");
// > Hi!
// > Hi!
```

## Cleanup

```javascript
dispose([action])
```

Every evented object has `dispose()` method. Without arguments it will do next 
three things:

* Emit "dispose" event.
* Execute all cleanup actions in FIFO order
* Off all events

To add cleanup action use `dispose()` with one argument - function.

# Aggregated events

`Ca.Flow` is Events on steroids. It's designed to solve "event flood" problem 
when one object that controls several other forwards all events from them. 
Instead emit events immediatelly, Flow holds all its events and emit them at 
once.

```javascript
var flow = .extend({}, Ca.Flow);
flow.on('ev', function(sender, data){
  console.log(data);
});

flow.flow();                    // Initiate flow phase
flow.emit('ev', 'any arg')
    .emit('ev', 'another arg', 'and another');
flow.flow(true);                // Close flow phase

// > ['any arg', ['another arg', 'and another']]
```

Regardless of flow phase, Flow emits events in different manner than `Events`. 
Callback are executed with two arguments sender's context and array of 
collected data. For convenience, if `emit()` fires with only one argument, it 
will not be wrapped in array.

```javascript
flow([emit])
```

To enter to flow phase use `flow()` without arguments. In flow phase all events 
will be holded. To emit them use `flow` with `true` as argument. 

If event order is mandatory, use `flowBy` property with array of events as 
value.

```javascript
flow.on('first', function(){ console.log('first') });
flow.on('second', function(){ console.log('second') });
flow.flowBy = ['first', 'second'];

flow.flow();
    .emit('second')
    .emit('first')
    .flow(true);

// > first
// > second
```

In addition to `Events#dispose`, Flow's `dispose` firstly emit all holded 
events.

# Model

Calcium uses lightweight Model implementation. To interact with persistence 
Models uses Conduits (see Conduits for details).

```javascript
// Model
var myModel = new Ca.Model();

// simple listener
var mkReporter = function(ev) {
  return function(model, data) {console.log(ev, data);};
};

myModel.on('change', mkReporter('model:changed'))
       .on('create', mkReporter('model:created'))
       .on('destroy', mkReporter('model:destroyed'));

// Put two records
myModel.set([{id: 1, field: "any"}, {id: 2, field: "another"}])
// > model:created [..., ...]

// Get one record, add callback
var record = myModel.get(1);
record.on('change', function(record, previous, dirty){
  console.log('record:changed', record.id, previous, dirty)
});
record.on('destroy', function(record){
  console.log('record:destroyed', record.id)
});

// Change directly
record.set({field: "Changed!"});
// > model:changed [{record: ..., previous: {field:"any"}, dirty: true}]
// > record:changed 1 {field:"any"} true

// Set in mass manner
myModel.set([
  {id:1, field:"And again"},
  {id:3, fiald:"new"}
]);
// > model:created [...]
// > model:changed [{record:..., previous:{field:"Changed!"}, dirty:true}]
// > record:changed 1 {field:"Changed!"} true

// And destroy
myModel.destroy([1,2]);
// > model:destroyed [...]
// > record:destroyed 1
```

Model holds Records - small evented objects. Records can not be created 
directly, only by `Model#set`. Every record has immutable `id` that unique 
within model. Also, record can have `dirty` flag which denotes that record is 
changed and out of sync with persistence.

## Events

*change* event emmited then any of attributes or `dirty` flag of record is 
changed. Callback will be fired with three arguments: record (`Ca.Events` 
convencion), hash of previous attributes and `dirty` flag.

On destroy record will emit *destroy* event with only one argument - record.

*invalid* event can be emmited in two cases. If new attributes failed (see 
below) or `record#set` tries to change record ID.

```javascript
// set handlers
myModel.on('invalid', mkReporter('model:invalid'))
record.on('invalid', function(record, attributes, reason){
  console.log('record:invalid', record.id, attributes, reason);
});

// Try to change ID for existing record
record.set({id:5});
// > 'model:invalid' [{record:..., attributes:{id:5}, 
//        reason:"Can't change record id"}]
// > 'record:invalid' 1 {id:5} Can't change record id
```

Model is based on `Ca.Flow`. It also emits *change*, *destroy* and *invalid* 
events. But instead directly forward, model collects events from records and 
emit them all at once.

Model emits *create* event then some records are added in model. If creation 
fails (new attributes fails validation), model will emit *invalid* event.

Also, models emits two events for interacting with conduits: *fetch* and 
*commit*.

## Subclassing

Model supports `extend()` as usual, see above for details. Records can't be 
extended. They just holds data.

## Creating records



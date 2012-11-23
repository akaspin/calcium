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

# Events

## `Ca.Events` Evented objects

Events is a module that can be mixed in to any object, giving the object 
ability to bind and trigger custom named events.
 
```javascript
var myEvented = _.extend({}, Ca.Events)
```

### `on()` Bind

```javascript
on(events, callback, [context], [dispose])
```

Bind a callback function to an object. The callback will be invoked whenever 
the event is fired. The `events` string may also be a space-delimited list of 
several events.

To supply a `context` value for this when the callback is invoked, pass the 
optional third argument.

If `context` provided and it evented too, use `dispose` flag to automatically 
turn-off all `context` events for `this` then `context` emit "dispose" event. 

### `off()` Unbind

```javascript
off(events, [callback], [context])
```
    
Remove a previously-bound `callback` function from an object. If no `context` 
is specified, all of the versions of the `callback` with different contexts 
will be removed. If no `callback` is specified, all callbacks for the `event` 
will be removed. If no `event` is specified, all event callbacks on the object 
will be removed.

### `emit()` Trigger callbacks

```javascript
emit(events, [args])
```
    
Trigger all callbacks for `events`. Callbacks will be triggered with sender as 
first argument and `args`.

### `dispose()` Cleanup

    dispose([action])

Without arguments `dispose` will do next things:

* Emit "dispose" event.
* Execute all cleanup actions
* Off all events

## `Ca.Flow` Aggregated events

Flow is Events on steroids. It's designed to solve "event flood" problem when 
one object that controls several other forwards all events from them. Instead 
emit events immediatelly, Flow holds all its events and emit them at once.

    object.on('ev', function(sender, data){
      alert(data);
    });

    object.flow();                    // Initiate flow phase
    object.emit('ev', 'any arg')
          .emit('ev', 'another arg', 'and another');
    object.flow(true);                // Close flow phase
    
    // ['any arg', ['another arg', 'and another']]

Regardless of flow phase, Flow emits events in different manner than `Events`. 
Callback are executed with two arguments sender's context and array of 
collected data.

### `flowBy` Organize flow

To leverage Flow emit events in concrete order use `flowBy` property.

    flowBy = ['first', 'second']

### `flow()` Initiate/Stop

    flow([emit])
    
Without arguments `flow` will initiate flow phase. In flow phase all events 
will be holded. To emit them use `flow` with `true` as argument.

### `emit()` Emit/Collect

    emit(events, [args])

Outside flow phase event will be triggered immediatelly, otherwise event will 
be holded. If args array has only one element, it will be interpreted as-is.

### `dispose()` Cleanup

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
within model. And ofcourse records emits events.

`"change"`  

## `Ca.Model`

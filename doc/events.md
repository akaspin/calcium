> [Index](https://github.com/akaspin/calcium/blob/master/docs/index.md) 

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

# Binding and unbinding

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

# Triggering

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

# Cleanup

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
var flow = _.extend({}, Ca.Flow);
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

In addition to `Events.dispose`, Flow's `dispose` firstly emit all holded 
events.
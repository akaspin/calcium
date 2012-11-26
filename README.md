Calcium is another Javascript/MVC bicycle. It heavily inspired by 
Backbone.js but, in contrast, has the following objectives:

* Avoid overbloated "god" objects.
* Minimal memory usage. Using RISK-like architecture.
* Completely predictable behavior.
* Browser-first. Support for node.js only if it does not interfere.

# Depenndencies

Calcium depends to *underscore.js* (or *lodash.js*). Also, for ajax and DOM 
manipulations, some Calcium components uses jQuery (or Zepto).

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
record.on('change', function(record, previous){
  console.log('record:changed', record.id, previous)
});
record.on('destroy', function(record){
  console.log('record:destroyed', record.id)
});

// Change directly
record.set({field: "Changed!"});
// > model:changed [{record: ..., previous: {field:"any"}}]
// > record:changed 1 {field:"any"}

// Set in mass manner
myModel.set([
  {id:1, field:"And again"},
  {id:3, fiald:"new"}
]);
// > model:created [...]
// > model:changed [{record:..., previous:{field:"Changed!"}}]
// > record:changed 1 {field:"Changed!"}

// And destroy
myModel.destroy([1,2]);
// > model:destroyed [...]
// > record:destroyed 1
```

Model holds Records - small evented objects. Records can not be created 
directly, only by `Model.set`. Every record has immutable `id` that unique 
within model. Also, record can have `dirty` flag which denotes that record is 
changed and out of sync with persistence.

## Events

*change* event emmited then any of attributes or `dirty` flag of record is 
changed. Callback will be fired with three arguments: record (`Ca.Events` 
convention), hash of previous attributes and `dirty` flag.

On destroy record will emit *destroy* event with only one argument - record.

*invalid* event can be emmited in two cases. If new attributes failed (see 
below) or `record.set` tries to change record ID.

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

## Subclassing and initialization

Model supports `extend()` as usual, see above for details. Records can't be 
extended. They just holds data.

```javascript
var MyModel = Ca.Model.extend({
  ...
});
```

Also, model options can be provided on instantiation.

```javascript
var myModel = new Ca.Model({
  ...
});
```

To execute any operations on model creation define `init()` method.

```javascript
var MyModel = Ca.Model.extend({
  init: function(options) {
    console.log("I'm alive");
  }
});
var myModel = new MyModel();

// > I'm alive
```

## Creating and changing records

```javascript
Model.set(incoming, [options])
record.set(attributes, [options])
```

Records can be created by only one way - `model.set()` with array of hashes as 
`incoming`. 

```javascript
myModel.set([{id: 1, field: "any"}, {field: "another"}])
```

If record with ID not exists in model, it will be created. Otherwise, it will 
be updated. If hash does not contain ID, it will be created automatically.

Model that holds record can be acessed my `model` property of record.

By default, on creation model looking for `id` attribute in hash. But if 
you're directly communicating with a backend (CouchDB, MongoDB) that uses a 
different unique key, you may set a Model's `id` to transparently map from 
that key to id.

```javascript
var myModel = new (Ca.Model.extend({
  id: '_id'
}))();
myModel.set([{_id: 1, field: "any"}])
console.log(model.get(1).id)

// > 1
```

To change record use record's `set()` with hash of changed attributes or 
`Model.set()` with array of hashes. If record with ID in hash exists, it will 
be updated.

When record created or changed, Calcium sets `dirty` flag of record to true. 
To unset `dirty` (or set attributes with unsetting `dirty`), use 
`{clean:true}` in `options`. This works in both `set()` methods of model and 
record.

```javascript
record.set({}, {clean:true});
// or
model.set([{id:1}, {id:2}], {clean:true});
```

Another way is use `Model.commit()` see below for details.

## Accessing records

```javascript
Model.get(id)
```

You can access records by three ways. Simplest is `Model.get()` with ID. This 
has already been used above. This method returns record or `undefined` if 
it not exists in model.

Another ways is usage of `records` and `ids` Model properties.

```javascript
console.log(_.pluck(model.records, 'id'));
console.log(model.ids);

// [1, 2, 3]
// {1: ..., 2: ...}
```

`records` is regular array, `ids` is regular hash where record's ids are 
mapped to records. To avoid problems don't modify them directly. but no one 
stops you to use any tools such *underscore*, *lodash* or anything for 
searhing.

## Accessing record data

```javascript
record.get(attribute)
```

`record.get()` returns attribute value or `undefined` for non-existent 
attributes.

Another way is direct access to record's `attributes` property. It's regular 
hash where attributes mapped to values. But don't change them directly. Use 
`set()` methods of model or record. Same notes for record's `dirty` property.

## Art of destruction

```javascript
Model.destroy(ids, [options])
record.destroy([options])
```

Let's play with hummer. Use `destroy()` of model or record for fun and 
pleasure.

```javascript
model.destroy([1,3,'or string id']);
// or
record.destroy();
```

Destroyed records are not destroyed completely. Instead, they are moved to 
`ghosts` property of model. `ghosts` is hash where destroyed ids mapped to 
destroyed records. To avoid necromancy, use `{clean:true}` in `options` of 
both `destroy()`.

```javascript
model.destroy([1,3,'or string id'], {clean:true});
// or
record.destroy({clean:true});
```

Another way to do exorcism is `Model.commit()`. See below.

## Validation

To validate attributes on record changing or creation define `validate()` for 
model.

```javascript
var MyModel = Ca.Model.extend({
  validate: function(attributes) {
    if ( !attributes.firstName )
      return "First name is required";
  }
});
```

If `validate()` returns anything, the validation will fail and an `invalid`
event will be fired on the record (on change) and model. `validate()` always 
executed in model's context. Then record changing, `validate()` always 
receives clone of full model attributes with overrided changed properties.

## Commiting and fetching

```javascript
Model.commit([options])
Model.fetch([options])
```

Without `{clean:true}`, `set()` and `destroy()` are "leaving trails" in model 
and records (`dirty` and `ghosts`). It's not part of evil plan. "Trails" used 
for `commit()` method.

Use `commit()` to consolidate changes (create, change or destroy records) in 
persistence. After `commit()` all `dirty` will be unsetted, `ghosts` will be 
cleared. `commit()` also takes `{clean:true}` in options. Use it to leverage 
`commit()` to not interact with persistence and just clean model.

`fetch()` fetches data from persistence. It takes only one argument `options`.

Both `commit()` and `fetch()` `options` and behaviour are depends on model's 
`conduit`. It can be Conduit instance or function that returns conduit. By 
default it `undefined`. 

If model has no conduit `commit()` always just clean model, and `fetch()` is 
noop. When model attached to conduit, it just emits *fetch* and *commit* 
events on corresponding method.

## Input and output

```javascript
Model.income(attributes)
Model.outcome()
```

For transform data fetched or sended to conduits use `income()` and 
`outcome()`.

```javascript
var MyModel = Ca.Model.extend(
  income : function(attributes) {
    return _.extend({mayBeMissing: "I'm here"}, attributes);
  },
  outcome : function(){
    return this.attributes;
  }
);
```

`income()` executed in *model's* context. It takes `attributes` hash for one 
record. `outcome()` executed in *record's* context. It just 
returns hash of attributes. Calcium always clone attributes before `income()` 
and results of `outcome()`.

There is no need to invoke both methods directly. This burden falls on the 
shoulders of Conduit.

Conduit... conduit... What is this thing? A little patience.

# Conduits

Conduits is way for models to interact with persistence. Model can be attached 
to only one conduit. But conduit can serve many models. Main advantage of 
this approach is lightweight models.

To attach model to conduit, define Model's `conduit` property by `extend` or 
in `options`. `conduit` may be conduit instance or function that returns 
conduit. 

```javascript
var ModelWithConduit = Ca.Model.extend({
  conduit: anyConduit
});
// or
var modelWithConduit = new Ca.Model({
  conduit: anyConduit
});
```

The other way to attach model to conduit is Conduit's `attach()` method with 
model as argument. If model already attached to another conduit, `attach()` 
will throw error. To detach model from conduit, use conduit's `detach()` with 
model as argument.

All conduits are in `Ca.Conduit` namespace.

# Ajax conduit

`Ca.Conduit.Ajax` is common way to interact with server backends. 








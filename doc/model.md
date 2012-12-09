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

## Record states

Record can have two optional properties. `dirty` flag means that record 
attributes was changed. `fresh` means that record isn't stored in persistence. 
To avoid problems, don't change above stuff directly. There are simpler ways.

```javascript
record.set({}, {clean:true});
// or
model.set([{id:1}, {id:2}], {clean:true});
```

`{clean:true}` in options of `set()` method leverages Calcium to remove (or 
not set) `dirty` and `fresh` properties of record.  

Destroyed records are not destroyed completely. Instead, they are moved to 
`ghosts` of model. `ghosts` is hash where destroyed ids mapped to destroyed 
records. Calcium never move fresh records to `ghosts`. Easy come - easy go.

```javascript
model.destroy([1,3,'or string id'], {clean:true});
// or
record.destroy({clean:true});
```

`destroy()` also can take `{clean:true}` in options. With this option, record 
will be destroyed without trails. Another way is `record.dispose()`. 
`dispose()` is chainsaw. It works for live and `ghost` records.  

However, the easiest and the right way is `Model.commit()`

## Commiting

```javascript
Model.commit([options])
```

`commit()` fixes all model operations. Maintains model's `ghosts`, cleans 
`dirty` and `fresh` flags for records. And of course, `commit()` commits all 
model operations in persistence.

`commit()` also can take `{clean:true}` in options. It leverages `commit()` 
*not* interact with persistence and just clean model.

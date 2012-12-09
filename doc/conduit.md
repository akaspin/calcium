Conduits is way for models to interact with persistence. Model can be attached 
to only one conduit. But conduit can serve many models. Main advantage of 
this approach is lightweight models.

# Binding

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

Regardless of conduit implementation, usage of model remains as always.

```javascript
var ajaxConduit = new Ca.Conduit.Ajax();
var myModel = new Ca.Model({
  conduit: ajaxConduit
});
myModel.fetch({data: {start:20, limit:10}});
myModel.set([{id: 23, field: 'me'}]);
myModel.commit();
```

# Design

'error' conduit model signature

'fetch' [{ ... }, ]

'destroy', conduit, model, [{ id: error }]

'create', [id : { ... }], [{id: error}]

'change', [{id : error}]
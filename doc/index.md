# Namespace and subclassing

All Calcium located inside `Ca` namespace.

Calcium uses Backbone-like mechanizm for subclassing objects. For convenience 
`extend` available in `Ca` namespace.

```javascript
var MyObj = {}
MyObj.extend = Ca.extend;
var MySubObj = MyObj.extend({ ... });
```

Also, you can use fine-grained method for extending all Calcium classes.

```javascript
// Constructor
var My = function(options) {
  this.setup(options);
  this.init.apply(this, arguments);
};

// Methods
_.extend(My.prototype, Ca.Model.prototype, {
  // methods here
});

// Bind extend
My.extend = Ca.extend
```

All Calcium classes contains `setup()` method for basic setup.

# Components

[Events](https://github.com/akaspin/calcium/blob/master/docs/events.md) 
[Model](https://github.com/akaspin/calcium/blob/master/docs/model.md) 
[Conduit](https://github.com/akaspin/calcium/blob/master/docs/conduit.md) 

# Basic usage
# Calcium

It's another Javascript/MVC bicycle. It heavily inspired by *Backbone.js* but, 
in contrast, has the following objectives:

* Avoid overbloated "god" objects.
* Minimal memory usage.
* Completely predictable behavior.
* Browser-first. *node.js* only if it does not interfere.

## Namespace

All Calcium located inside `Ca` namespace.

## Extending

Calcium extending objects is same way as *Backbone*. But, `Ca` exports 
`extend`:

    var Obj = Ca.extend({}, Another);
    
## Events

 

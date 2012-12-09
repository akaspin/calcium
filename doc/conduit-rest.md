`Ca.Conduit.REST` implements standart HTTP REST transport. It encodes all of 
its request's parameters with JSON, and expects JSON encoded responses.

# Backend

As mentioned before, REST conduit uses standart REST methods for operations. 

```
get     -> GET    /model-url[?data]
create  -> POST   /model-url
change  -> PUT    /model-url/id
destroy -> DELETE /model-url/id
```

It's not effective, but this mapping supported by a bunch of backends.

# URL

To determine resource REST conduit uses Model's or its own `url`.  

```javascript
var conduit = new Ca.Conduit.REST({
  url: function() {
    return '/global-url';
  }
});

var model = new Ca.Model({
  conduit: conduit,
  url: '/model-url'     // Oderrides `conduit.url`
});
```

`url` can be string or function. 
(function() {

  
  beforeEach(function() {
    // uuid
    var counter = 50000;
    var uid = function() {
      counter++;
      return counter;
    };
    
    // Query parser. 
    /**
     * @returns {Object}
     */
    var parseQuery = function(qstr) {
      var split = qstr.split('?');
      qstr = split[1];
      var query = {};
      if (split.length > 1) {
        var a = qstr.split('&');
        for (var i in a) {
          var b = a[i].split('=');
          query[decodeURIComponent(b[0])] = parseInt(decodeURIComponent(b[1]));
        }
      }
      query.url = split[0];
      return query;
    };
    
    var jsonHeaders = {
        "Content-Type": "application/json"
    };
    
    // Backend storage
    var store = this.store = new Ca.Model();
    
    //
    // Fake HTTP server.
    //
    
    this.server = sinon.fakeServer.create();
    
    //
    // REST fetch
    // GET /any?start=<id>&end=<id>err=<error-code>
    //
    this.server.respondWith('GET', /\/(.+)/, function(xhr, url) {
      var q = parseQuery(url);
      if (!q.err) {
        var toRespond = _.filter(_.pluck(store.records, 'attributes'), 
            function(attrs) {
          var s = _.has(q, 'start') ? attrs[store.id] >= q.start : true;
          var e = _.has(q, 'end') ? attrs[store.id] <= q.end : true;
          return s && e;
        });
        xhr.respond(200, jsonHeaders, JSON.stringify(toRespond));
      } else {
        xhr.respond(q.err);
      }
    });

    //
    // REST create
    // POST /rest with hash as body
    //
    this.server.respondWith('POST', /\/rest/, function(xhr, url) {
      var input = JSON.parse(xhr.requestBody);
      if (_.has(input, input[store.id]) && store.get(input.id)) {
        xhr.respond(409);
      } else {
        !_.has(input, store.id) && (input[store.id] = uid());
        store.set([input]);
        xhr.respond(200, jsonHeaders, JSON.stringify(input));
      }
    });
    
    //
    // REST change
    // PUT /rest/<id> with hash as body
    //
    this.server.respondWith('PUT', /\/rest\/(\d+)/, function(xhr, id) {
      id = parseInt(id);
      var record;
      if(record = store.get(id)) {
        var input = JSON.parse(xhr.requestBody);
        record.set(input);
        xhr.respond(200, jsonHeaders, JSON.stringify(input));
      } else {
        xhr.respond(404);
      }
    });

    //
    // REST destroy
    // DELETE /rest/<id>
    //
    this.server.respondWith('DELETE', /\/rest\/(\d+)/, function(xhr, id) {
      id = parseInt(id);
      var record;
      if(record = store.get(id)) {
        record.destroy();
        xhr.respond(200);
      } else {
        xhr.respond(404);
      }
    });

    this.server.respondWith('OPTIONS', /\/(.+)/, function(xhr, url) {
      var q = parseQuery(url);
      console.log('OPTIONS', q);
      xhr.respond(200);
    });
  });
  
  afterEach(function() {
    this.server.restore();
  });
})();
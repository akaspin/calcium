(function() {
    beforeEach(function() {
      // spies
      var mkSpy = function(prefix, events, obj) {
        var spy = jasmine.createSpyObj(_.uniqueId(prefix), events);
        _.each(events, function(event) {
          this.on(event, spy[event]);
        }, obj);
        return spy;
      };
      this.mkModelSpy = function(model) {
        return mkSpy('model', ['create', 'change', 'destroy', 'invalid', 
                               'fetch', 'commit'], model);
      };
      this.mkRecordSpy = function(record) {
        return mkSpy('record', ['change', 'destroy', 'invalid'], record);
      };
      
      // Make range
      this.mkRange = function(start, stop, id, mark) {
        id || (id = 'id');
        mark || (mark = 'none');
        return _.map(_.range(start, stop+1), function(i) {
          var res = {
              stringed : i+'',
              mark: mark
          };
          res[id] = i;
          return res;
        });
      };
    });
    
})();
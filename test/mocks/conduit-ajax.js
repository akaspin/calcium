(function() {
  var ajaxDefaults = defaults = {
      contentType: 'application/json',
      dataType: 'json',
      processData: true,
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
  };
  
  describe('Mock REST', function() {
    
    beforeEach(function() {
      this.store.set(this.mkRange(0,49));
    });
       
    it('Deferred $', function() {
      var count = 0;
      
      var doReq = function(settings) {
        var deferred = $.Deferred();
        promise = deferred.promise();
        $.ajax(_.extend({}, ajaxDefaults, settings))
          .always(function() {
            count++;
            console.log(arguments);
            deferred.resolve({id: 'a', res: arguments});
          });
        return promise;
      };
      
      var finalizer = function() {
        console.log('al', arguments);
        count = 2;
      };
      
      runs(function() {
        $.when.apply($, [
        doReq({
          url: '/rest',
          type: 'GET',
          data: {start: 0, end:3}
        }),
        doReq({
          url: '/rest',
          type: 'GET',
          data: {err: 404}
        })]).done(finalizer);
      });
      
      waitsFor(function() {
        return count == 2;
      });
      
      runs(function() {
        console.log('done');
      });
      
    });
    
  });
})();
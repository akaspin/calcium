(function() {
  
  describe('Mock ajax', function() {
    
    beforeEach(function() {
      
      
      this.server = sinon.fakeServer.create();
      
      /*
       * GET returns array of hashes
       */
      this.server.respondWith('GET', /(.*)/, function(xhr, url) {
        xhr.respond(200);
      });
      /*
       * POST takes hash where fresh records ids are mapped to data. 
       */
      this.server.respondWith('POST', /(.*)/, function(xhr, url) {
        xhr.respond(200);
      });
      /*
       * PUT takes array of hashes and returns hash with 
       */
      this.server.respondWith('PUT', /(.*)/, function(xhr, url) {
        xhr.respond(200);
      });
      /*
       * DELETE takes array of IDs
       */
      this.server.respondWith('delete', /(.*)/, function(xhr, url) {
        xhr.respond(200);
      });
      this.server.autoRespond = true;
    });
    
    afterEach(function() {
      this.server.restore();
    });

    
    it('$', function() {
      var flag = false, value = 0;
      
      runs(function() {
        $.get('/fakeurl', function() {
          value++;
          flag = true;
          console.log('ok');
        });
        $.get('/fakeur', function() {
          value++;
          flag = true;
          console.log('ok');
        });
      });
      
      waitsFor(function() {
        return flag;
      });
      
      runs(function() {
        console.log(value);
        expect(value).toBeGreaterThan(0);
      });
    });
    
    it('deferred', function() {
      var chunk = function(time, re, value) {
        var dfd = $.Deferred();
        setTimeout(function() {
          dfd[re](value);
        }, time);
        return dfd.promise();
      };
      
      chunk(30, 'reject', 'val')
        .done(function(value) {
          console.log('done', value);
        })
        .fail(function(value) {
          console.log('fail', value);
        })
        .then(
            function(value) {
              console.log('ok', value);
            },
            function(value) {
              console.log('failed', value);
            });
    });
    
    it('queue', function() {
      var Queue = $({});
      Queue.queue('aaa', function(next) {
        console.log('me');
        next();
      });
      console.log(Queue.queue());
    });
  });
})();
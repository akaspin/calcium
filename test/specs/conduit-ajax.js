(function() {
  describe('Mock', function() {
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
(function() {
  describe("REST Conduit", function() {
    beforeEach(function() {
      this.store.set(this.mkRange(0,49));
      this.conduit = new Ca.Conduit.REST({url: '/rest'});
      this.model = new Ca.Model({conduit: this.conduit});
      this.spy = this.mkModelSpy(this.model);
    });
    
    describe('pit', function() {
      xit('pit', function() {
        var ok = 0;
        this.model.on('fetch', function() {
          ok++;
        });
        
        runs(function() {
          this.model.fetch({data: {start: 0, end:3}});
          this.model.fetch({data: {start: 5, end:10, err: 404}});
          this.server.respond();
          this.server.respond();
        });
        waitsFor(function() {
          return ok == 2;
        });
        
        runs(function() {
          console.log('ok');
        });
      });
      it('pit', function() {
        var ok = 0;
        this.conduit.on('destroy', function() {ok++;});
        this.model.set(this.mkRange(0,49), {clean:true});
        this.model.destroy([1,2]);
        
        runs(function() {
          this.model.commit();
          this.server.respond();
          this.server.respond();
        });
        waitsFor(function() {
          return ok == 1;
        });
        
        runs(function() {
          console.log('ok');
        });
      });
    });

    
  });
  
})();
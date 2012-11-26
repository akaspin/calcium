(function() {
  describe("Flow", function() {
    beforeEach(function() {
      var events = ['one', 'two', 'three'];
      this.spy = jasmine.createSpyObj('master', events);
      this.master = _.extend({}, Ca.Flow);
      _.each(events, function(event) {
        this.master.on(event, this.spy[event]);
      }, this);
    });
    
    describe('in flow phase', function() {
      
      it('should emit ordered events first', function() {
        var order = [];
        _.extend(this.master, {flowBy:['three', 'two']});
        this.master
          .on('one', function() { order.push('one'); })
          .on('two', function() { order.push('two'); })
          .on('three', function() { order.push('three'); });
        this.master.flow();
        this.master.emit('one', {}).emit('two', {}).emit('three', {});
        this.master.flow(true);
        expect(order).toEqual(["three", "two", "one"]);
      });
    });
  });
})();
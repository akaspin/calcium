(function() {
  describe('Events', function() {
    beforeEach(function() {
      // Create some evented objects
      this.counter = 0;
      this.actions = [];
      var that = this;
      this.action = function() {
        that.counter++;
        that.actions.push(arguments.length ? arguments[0] : {}) ;
      };
      
      this.master = _.extend({}, Ca.Events);
    });
    
    describe('on generic callbacks', function() {
      beforeEach(function() {
        var that = this;
        this.actors = _.map(_.range(0, 5), function(i) {
          return {
            i : i,
            cb : function(ev) {
              that.action({event: ev, me: this.i});
            }
          };
        });
      });
      
      it('should bind and emit events in FIFO order', function() {
        var actor = this.master, counter = 0, stream = [];
        actor.on('event1 event2', function(_sender, i) {
          counter++;
          stream.push(i);
        });
        actor.emit('event1', 1);
        actor.emit('event1 event2', 2);
        expect(counter).toBe(3);
        expect(stream).toEqual([1,2,2]);
      });
      it('should not bind duplicate events', function() {
        var master = this.master;
        master.on('event', this.action);
        master.on('event', this.action);
        master.emit('event');
        expect(this.counter).toBe(1);
      });
      it('should bind events in FIFO order', function() {
        var master = this.master;
        _.each(this.actors, function(actor) {
          master.on('event', actor.cb, actor);
        }, this);
        master.emit('event');
        expect(_.pluck(this.actions, 'me')).toEqual([0,1,2,3,4]);
      });
      it('should correctly unbind events with context', function() {
        var master = this.master;
        _.each(this.actors, function(actor) {
          master.on('event', actor.cb, actor);
        }, this);
        master.off(null, null, this.actors[3]);
        master.emit('event');
        expect(_.pluck(this.actions, 'me')).toEqual([0,1,2,4]);
      });
    });
    
    describe('on evented callbacks', function() {
      beforeEach(function() {
        var that = this;
        this.actors = _.map(_.range(0, 5), function(i) {
          return _.extend({
            i : i,
            cb : function(ev) {
              that.action({event: ev, me: this.i});
            }
          }, Ca.Events);
        });
      });
      
      it('should correctly unbind on dispose', function() {
        var master = this.master;
        _.each(this.actors, function(actor) {
          master.on('event', actor.cb, actor, true);
        }, this);
        this.actors[3].dispose();
        master.emit('event');
        expect(_.pluck(this.actions, 'me')).toEqual([0,1,2,4]);
      });
    });
  });
})();
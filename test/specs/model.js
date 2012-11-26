(function() {
  describe("Model", function() {
    beforeEach(function() {
      // just set simple model and attach spy
      this.model = new Ca.Model();
      this.model.set(this.mkRange(0,9), {clean:true});
      this.spy = this.mkModelSpy(this.model);
    });
    
    describe('on destroy should', function() {
      it('emit `destroy` on model.destroy()', function() {
        this.model.destroy([0,1]);
        expect(this.spy.destroy.callCount).toBe(1);
      });
      it('emit `destroy` on record.destroy()', function() {
        this.model.get(0).destroy();
        this.model.get(1).destroy();
        expect(this.spy.destroy.callCount).toBe(2);
      });
      it('unbind events for destroyed records', function() {
        this.model.get(0).destroy().set({mark: 'changed'});
        expect(this.spy.change.callCount).toBe(0);
      });
      it('move destroyed records to ghosts', function() {
        var zero = this.model.get(0);
        var one = this.model.get(1).destroy();
        this.model.destroy([0]);
        expect(this.model.ghosts[0]).toEqual(zero);
        expect(this.model.ghosts[1]).toEqual(one);
      });
      it('completelly destroy records with `{clean:true}`', function() {
        this.model.get(1).destroy({clean:true});
        this.model.destroy([0], {clean:true});
        expect(this.model.ghosts).toEqual({});
      });
      it('completelly destroy records on `record.dispose()`', function() {
        this.model.get(0).dispose();
        expect(this.model.ghosts).toEqual({});
      });
    });
    
    describe('on setting should', function() {
      it('emit `create` only for new records', function() {
        this.model.set(this.mkRange(0,11));
        expect(this.spy.change.callCount).toBe(0);
        expect(this.spy.create.callCount).toBe(1);
        expect(_.pluck(this.spy.create.argsForCall[0][1], 'attributes'))
            .toEqual(this.mkRange(10,11));
      });
      it('emit `change` only with changed attributes', function() {
        var recSpy = this.mkRecordSpy(this.model.get(0));
        this.model.set(this.mkRange(0,3, undefined, 'changed'));
        expect(_.pluck(_.pluck(this.spy.change.argsForCall[0][1], 'previous'), 
            'mark')).toEqual(["none", "none", "none", "none"]);
        expect(recSpy.change.argsForCall[0][1]).toEqual({mark: "none"});
      });
      it('clean `ghosts` for previously destroyed records', function() {
        this.model.destroy([0,1]).set(this.mkRange(0,1));
        expect(this.model.ghosts).toEqual({});
      });
      it('generate `id` to record then it not exists', function() {
        this.model.set([{dummy: 'dummy'}]);
        var record = this.spy.create.argsForCall[0][1][0];
        expect(record.attributes.id).not.toBeDefined();
        expect(record.id).toBeDefined();
      });
      it('emit `invalid` then trying to change `id`', function() {
        this.model.get(0).set({id: 20});
        expect(this.spy.invalid.callCount).toBe(1);
      });
    });
    
  });
  
})();
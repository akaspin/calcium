/*
 * Conduit core.
 * depends calcium.js 
 */

(function(){
  // Bind to Calcium namespace
  var Ca = this.Ca,
  $ = Ca.$;

  // Conduit NS
  Ca.Conduit = Ca.Conduit || {};
  
  /**
   * Conduit base.
   */
  Ca.Conduit.Base = {
      
      /**
       * Default setup
       * @param options
       */
      setup : function(options) {
        this._Queue = $({});
        options || (options = {});
        _.extend(this, options);
      },
      
      /**
       * Attach model to conduit
       * @param {Object} model Model
       */
      attach : function(model) {
        if (model._conduit === this) return;
        if (_.has(model, '_conduit') && model._conduit !== this) 
          throw new Error("Can't attach conduit. Model already has one.");
        model._conduit = this;
      },
      
      /**
       * Detach model from conduit
       * @param model
       */
      detach : function(model) {
        if (_.has(model, '_conduit')) {
          if (model._conduit !== this)
            throw new Error("Can't detach from conduit. \
            Model attached to another.");
          
          model.off(null, null, this);
          this.off(null, null, model);
          delete model._conduit;
        }
      },
      
      /**
       * Add operation to queue
       * @param operation Operation. Use empty array for clear. 
       *                  Omit to get queue 
       * @returns
       */
      queue : function(operation) {
        if (operation) {
          return this._Queue.queue(operation);
        } else {
          return this._Queue.queue();
        }
      },

      /**
       * Generalized commit
       * @param model
       */
      commit : function(model) {
        !_.isEmpty(model.ghosts) && this.destroy(model, _.keys(model.ghosts));
        var changes = _.groupBy(_.filter(model.records, 'dirty'), 
            function(record) {
          return record.fresh ? 'fresh' : 'dirty';
        });
        
        !_.isEmpty(changes.fresh) && this.create(model, changes.fresh);
        !_.isEmpty(changes.dirty) && this.change(model, changes.dirty);
      }
      
    };
  
}).call(this);
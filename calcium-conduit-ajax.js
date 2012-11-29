(function(){
  var Ca = this.Ca,
      $ = Ca.$;
  
  Ca.Conduit = Ca.Conduit || {};

  /**
   * Basic "dummy" conduit
   */
  var Base = Ca.Conduit.Base = {
    
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
      if (_.has(model, '_conduit') && model._conduit !== this) 
        throw new Error("Can't attach conduit. Model already has one.");
      if (model._conduit === this) return;
      model._conduit = this;
      
      // Bind model events
      model.on('fetch', this.modelFetch, this)
           .on('commit', this.modelCommit, this);
      
      // Bind conduit events
      this.on('destroy', model.conduitDestroy, model)
          .on('store', model.conduitStore, model)
          .on('fetch', model.conduitFetch, model);
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
    }

  };
  
  /**
   * Ajax conduit. This conduit uses following model optional 
   * properties:
   * 
   * - `host`
   * - `url`
   */
  var Ajax = Ca.Conduit.Ajax = function(options) {
    this.setup(options);
  };
  
  _.extend(Ajax.prototype, Ca.Events, Ca.Conduit.Base, {
    
    /**
     * Get url
     */
    _getUrl : function(model, id) {
      
    },
    
    modelFetch : function(model, options) {
      
    },
    
    modelCommit : function(model) {
      
    }
    
  });

}).call(this);
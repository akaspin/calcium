(function(){
  var Ca = this.Ca,
      $ = Ca.$;
  
  Ca.Conduit = Ca.Conduit || {};
  
  /**
   * Constructor
   */
  var Ajax = Ca.Conduit.Ajax = function() {
    this._Queue = $({});
    
    
  };
  
  _.extend(Ajax.prototype, Ca.Events, {
    
    /**
     * Attach conduit to model.
     * @param model Model
     */
    attach : function(model) {
      if (_.has(model, '_conduit') && model._conduit !== this) 
        throw new Error("Can't attach conduit. Model already has one.");
      if (model._conduit === this) return;
      model._conduit = this;
      
      // Bind model events
      model.on('fetch', this._onModelFetch, this);
      model.on('commit', this.commit, this);
      
      // Bind conduit events
      this.on('destroy', model._onConduitDestroy, model);
      this.on('store', model._onConduitStore, model);
      this.on('fetch', model._onConduitFetch, model);
    },
    
    detach : function(model) {
      if (_.has(model, '_conduit')) {
        if (model._conduit !== this)
          throw new Error("Can't detach from conduit. \
          Model attached to another.");
        
        model.off(null, null, this);
        this.off(null, null, model);
      }
    },
    
    /**
     * Fetch data from conduit
     * @param {Object} model Model that initiate fetch
     * @param options
     */
    _onModelFetch : function(model, options) {
      
    },
    
    commit : function(model, options) {
      
    }
  
  
  });
  
}).call(this);
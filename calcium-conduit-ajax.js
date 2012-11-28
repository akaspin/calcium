(function(){
  var Ca = this.Ca,
      $ = Ca.$;
  
  Ca.Conduit = Ca.Conduit || {};

  /**
   * Basic "dummy" conduit
   */
  var Base = Ca.Conduit.Base = {
    
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
     * Default setup
     * @param options
     */
    setup : function(options) {
      this._Queue = $({});
      options || (options = {});
      _.extend(this, options);
    },
    
    //
    // Model events
    //
    
    modelFetch : function(model, options) {
      
    },
    
    modelCommit : function(model) {
      
    }
  };
  
  
  /**
   * Constructor.
   * @param {Object} options
   */
  var Ajax = Ca.Conduit.Ajax = function(options) {
    this._Queue = $({});
    options || (options = {});
    _.extend(this, options);
  };
  
  _.extend(Ajax.prototype, Ca.Events, {
    
    /**
     * Default request setup
     */
    defaults : {
      contentType: 'application/json',
      dataType: 'json',
      processData: false,
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    },
    
    destroy : function(model, ids) {
      if (!ids.length) return;
      
    },
    
    /**
     * Parse response data.
     * @param data
     * @returns {Array} Parsed data
     */
    parse : function(data) {
      
    },
    
    /**
     * Serialize data for request
     * @param {Array} data From Model.outcome
     * @returns data for request 
     */
    serialize : function(data) {
      
    },
    
    //
    // Model handlers
    //
    
    /**
     * Fetch data from conduit
     * @param {Object} model Model that initiate fetch
     * @param options
     */
    modelFetch : function(model, options) {
      options || (options = {});
    },
    
    /**
     * Commit data to conduit
     * @param model
     */
    modelCommit : function(model) {
      var ids;
      // Collect all data
      
      this.destroy(model, _.keys(model.ghosts));
    },
  
    //
    // Utility
    //
    
    /**
     * 
     */
    _requestSettings : function(params, defaults) {
      return _.extend({}, this.defaults, defaults, params);
    },
    
    /**
     * Queue request. To clear queue use empty array ([]) as `request`. Omit 
     * arguments to get queue.
     * @param request Request
     */
    _queue : function(request) {
      return request ? this._Queue.queue(request) : this._Queue.queue();
    },
    
  });
  
}).call(this);
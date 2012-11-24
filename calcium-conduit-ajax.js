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
    
    attach : function(model, options) {
      
    }
  });
  
}).call(this);
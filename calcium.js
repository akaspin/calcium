/*
 * Calcium core
 */

(function(){
  
  // Initial Setup

  // Save a reference to the global object (`window` in the browser, `exports`
  // on the server).
  var root = this;

  // The top-level namespace. All public Ca classes and modules will
  // be attached to this. Exported for both CommonJS and the browser.
  var Ca;
  if (typeof exports !== 'undefined') {
    Ca = exports;
  } else {
    Ca = root.Ca = {};
  }

  // Current version of the library. Keep in sync with `package.json`.
  Ca.VERSION = '0.0.1';

  // Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

  // For Ca's purposes, jQuery, Zepto, or Ender owns the `$` variable.
  Ca.$ = root.jQuery || root.Zepto || root.ender;

  // Extend
  // -------------

  /**
   * Helper function to correctly set up the prototype chain, for subclasses.
   * Similar to `goog.inherits`, but uses a hash of prototype properties and
   * class properties to be extended.
   */
  Ca.extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };
  
  // Events
  
  //Regular expression used to split event strings
  var eventSplitter = /\s+/;

  // Internal function to find event
  var findCb = function(event, callback, context) {
    var i, 
        callbacks = this._events[event], 
        l = callbacks.length;
    for (i=0; i < l-1; i++) {
      if (callbacks[i] === callback && callbacks[i+1] === context ) return i;
    }
    return -1;
  };
  
  // Internal dispose event handler
  var _dispose = function(context) {
    this.off(null, null, context);
  };
  
  /**
   * Calcium events
   * ==============
   */
  Ca.Events = {

    /**
     * Bind events to callbacks with optional context.
     * @param {String} events Event names separated by spaces
     * @param {Function} callback Callback
     * @param {Object} context Callback execution context (optional)
     * @param {Boolean} bindDispose Bind dispose action. If context 
     *                  has `dispose` method, `on` automatically bind action  
     *                  to off all events if `this` emits "dispose" event. 
     */
    on : function(events, callback, context, dispose) {
      if (!callback) return this;
      events = events.split(eventSplitter);
      
      var _events = this._events || (this._events = {}),
          event, callbacks, added = false;
      while (event = events.shift()) {
        callbacks = _events[event] || (_events[event] = []);
        if (findCb.apply(this, [event, callback, context]) == -1) {
          callbacks.push(callback, context);
          added = true;
        } 
      }
      if (dispose && added && context && context !== this && context.dispose) 
          context.on('dispose', _dispose, this);
      
      return this;
    },
    
    /**
     * Unbind events.
     * @param {String} events Events
     * @param {Function} callback Callback
     * @param {Context} context Execution context (optional)
     * @returns self
     */
    off : function(events, callback, context) {
      var _events;
      
      // No events, or removing *all* events.
      if (!(_events = this._events)) return this;
      if (!(events || callback || context)) {
        delete this._events;
        return this;
      }
      
      events = events ? events.split(eventSplitter) : _.keys(_events);
      
      var i, event, callbacks, index;
      while (event = events.shift()) {
        // no callback and context
        if (!(callbacks = _events[event]) || !(callback || context)) {
          delete _events[event];
          continue;
        }
        // callback
        if (callback) {
          index = findCb.call(this, event, callback, context);
          if (index != -1) callbacks.splice(index, 2);
          continue;
        }
        // Context only
        for (i = callbacks.length - 2; i >= 0; i -= 2) {
          if (!(callback && callbacks[i] !== callback 
              || context && callbacks[i + 1] !== context)) {
            callbacks.splice(i, 2);
          }
        }
      }
      return this;
    },
    
    /**
     * Emit events
     * @param events
     * @returns self
     */
    emit : function(events) {
      var _events;
      if (!(_events = this._events)) return this;
      events = events.split(eventSplitter);
      // get args
      var args = _.rest(arguments), event, callbacks, i, length;
      args.unshift(this);
      while (event = events.shift()) {
        if (event = _events[event]) {
          callbacks = event.slice();  // prevent modification
          for (i = 0, length = callbacks.length; i < length; i += 2) {
            callbacks[i].apply(callbacks[i + 1] || this, args);
          }
        }
      }
      return this;
    },
    
    /**
     * Dispose evented object.
     * @param {Function} action Cleanup action
     */
    dispose : function(action) {
      if (!action) {
        this.emit('dispose');
        if (this._cleanups) {
          var i, cleanups = this._cleanups; l = cleanups.length;
          for (i=0; i < l-1; i++) cleanups[i].call(this);
        }
        delete this._cleanups;
        this.off();
      } else {
        var cleanups = this._cleanups || (this._cleanups = []);
        if (cleanups.indexOf(action) != -1) cleanups.push(action);
        return this;
      }
    }
  };
  
  /**
   * Event aggregator
   * ----------------
   * 
   * Use `flowBy` to order events.
   * 
   *     flowBy : ['first', 'second']
   */
  Ca.Flow = _.extend({}, Ca.Events, {
    
    /**
     * Flow events. After execute `flow` without arguments all emitted events
     * will be holded.
     * 
     * To emit events use `flow(true)`. In this case, all holded events will 
     * be emitted in following form:
     * 
     *     'event-name', this, [events data]
     * 
     * @param emit Emit events and clear queue
     */
    flow : function(emit) {
      if (!emit) {
        this._flow || (this._flow = {});
      } else {
        if (this._flow) {
          var event, data, 
              order = _.union((this.flowBy || []), _.keys(this._flow));
          
          
          while (event = order.shift()) {
            if (data = this._flow[event]) {
              Ca.Events.emit.call(this, event, data);
            }
          }
          delete this._flow;
        }
      }
      return this;
    },
    
    /**
     * Emit event. Overrided behaviour is differ than `Ca.Events.emit`.  
     * 
     * @param events Events
     */
    emit : function(events) {
      var rest = _.rest(arguments);
      if (rest.length == 1) rest = rest[0];
      if (!this._flow) {
        Ca.Events.emit.call(this, events, [rest]);
      } else {
        var event, flow;
        events = events.split(eventSplitter);
        while (event = events.shift()) {
          flow = this._flow[event] || (this._flow[event] = []);
          flow.push(rest);
        }
      }
      return this;
    },
    
    /**
     * Dispose. Always emit all holded events before dispose. 
     * @param action
     */
    dispose : function(action) {
      if (!action) {
        this.flow(true);
      }
      Ca.Events.dispose.call(this, action);
    }
  });
  
  
}).call(this);
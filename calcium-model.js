/*
 * Calcium Model.
 * depends calcium.js
 */

(function(){
  // Bind to Ca namespace
  var Ca = this.Ca;
  
  // Simple guid
  function guid() {
    return _.uniqueId(Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15));
  }
  
  /**
   * Internal record constructor.
   * @param {Object} model Model
   * @param {Object} attributes Attributes
   * @param {Boolean} clean Already synced with persistence
   * @throws Error if attributes not pass `validate`;
   * @constructor
   */
  var _Record = function(model, attributes, clean) {
    this.model = model;
    var invalid, id = model.id;
    if (model.validate && (invalid = model.validate.call(model, attributes))) 
      throw new Error(invalid);
    this.attributes = attributes;
    if (!clean) {
      this.dirty = true;
      this.fresh = true;
    }
    this.id = _.has(attributes, id) ? attributes[id] : guid();
    this.dispose(function() {
      delete this.model;
      delete this.attributes;
    });
  };
  
  // Record methods
  _.extend(_Record.prototype, Ca.Events, {
    
    /**
     * Get record attribute by its name.
     * @param attribute Attribute name
     * @returns Attribute value or `nothing`
     */
    get : function(attribute) {
      return this.attributes[attribute];
    },
    
    /**
     * Set or add attributes.
     * 
     * Emits "change" event with hash of previous changed attributes and 
     * `dirty` flag value. Also may emit "invalid" event if new attributes 
     * fail test against Model's `validate` or contains non-equal ID.
     * 
     * If any changes detected sets `dirty` flag. To override use `clean:true`
     * in options.  

     * @param {Object} attributes Changed or added attributes
     * @param {Options} options 
     * @returns {Object} Record
     */
    set : function(attributes, options) {
      options || (options = {});
      var model = this.model;
      
      // Check ID and validate
      var invalid = false;
      var newId = attributes[model.id];
      if (newId !== this.id) invalid = "Can't change record id";
      // Validate record
      if (!invalid && model.validate) invalid = model.validate.call(model, 
                _.extend({}, this.attributes, attributes));
      // If any invalid results emit "invalid event"
      if (invalid) {
        this.emit('invalid', attributes, invalid);
        return this;
      }
      
      // All ok - set new
      var previous = {}, now = _.clone(this.attributes),
      oldDirty = this.dirty;
      oldFresh = this.fresh;
      
      _.forOwn(attributes, function(value, key) {
        if (!_.has(now, key) || !_.isEqual(now[key], value)) {
          previous[key] = now[key];
          this.attributes[key] = value;
          this.dirty = true;
        }
      }, this);
      
      // On clean setting override `dirty` value
      if (options.clean) {
        delete this.dirty;
        delete this.fresh;
      }
      
      // If any changes - set dirty flag and emit event
      if (!_.isEmpty(previous) 
          || oldDirty != this.dirty 
          || oldFresh != this.fresh) {
        this.emit('change', previous);
      }
      
      return this;
    },
    
    /**
     * Destroy record in model. 
     * 
     * To disable destroy model in persistence use `clean:true` in `options`. 
     * With `clean:true` fires record's `dispose` method. Othervise, 
     * `dispose` will be fired after model's `sync`.
     *  
     * Emits "destroy" event.
     * 
     * @param {Object} options Options
     * @returns Record
     */
    destroy : function(options) {
      options || (options = {});
      this.emit('destroy', options);
      if (options.clean || this.fresh) this.dispose();
      return this;
    }
  });
  
  /*
   * Model
   * -----
   * 
   * - `id` 
   * - `records`
   * - `ids`
   * - `conduit`
   * - `ghosts`
   */
  
  /**
   * Model.
   * @param {Object} options Options
   * @constructor
   */
  var Model = Ca.Model = function(options) {
    this.setup(options);
    // fire init
    this.init.apply(this, arguments);
  };
  
  // Model methods
  _.extend(Model.prototype, Ca.Flow, {
    
    flowBy : ['destroy', 'change', 'create', 'invalid'],
    
    /**
     * ID attribute name.
     * 
     * A records's ID is stored under record `id` attribute. If you're 
     * directly communicating with a backend (CouchDB, MongoDB) that uses 
     * a different unique key, you may set a Model's `id` to transparently 
     * map from that key to id.
     */
    id : 'id',

    /**
     * Default setup for model. Use only for fine-tuned models.
     * @param {Object} options Options
     */
    setup : function(options) {
      // set props
      this.ids = {};
      this.records = [];
      this.ghosts = {};
      options && _.extend(this, options);
      
      // Attach to conduit
      var conduit = _.result(this, 'conduit');
      if (conduit && conduit.attach) conduit.attach(this);
      
      // set dispose action
      this.dispose(function() {
        // Clean destroy all records
        this.destroy(_.keys(this.ids), {clean:true});
        
        // kill ghosts
        _.each(_.values(this.ghosts), function(ghost) {
          ghost.dispose();
        });
        
        // final cleanup
        delete this.ghosts;
        delete this.ids;
        delete this.records;
      });
      
    },
    
    /**
     * Initializer. Called by constructor.
     */
    init : function(){},
    
    /**
     * Get record by its ID.
     * @param ids Record ID
     * @returns {Object} Record
     */
    get : function(id) {
      return this.ids[id];
    },
    
    /**
     * Create or update records.
     * 
     * Can reset Model by removing records with IDs not present in 
     * `incoming`. To enable it use `reset:true` in options.
     * 
     * Emits "change", "create" and "invalid" events. Also may emit "destroy" 
     * event if `reset` enabled. To suppress events use `silent:true` in 
     * options.
     * 
     * Sets record's `dirty` flag. To remove it use `clean:true` in options.
     * 
     * @param {Array} incoming Incoming data.
     * @param {Object} options Options
     * @returns {Object} Model
     */
    set : function(incoming, options) {
      options || (options = {});
      incoming = incoming.slice();
      
      var i, length, attrs, record, ingest = [], existing; 

      if (options.reset) {
        // Then reset - remove orphans with `clean:true`.
        // Calculate orphan ids
        var orphans = _.difference(_.pluck(this.records, 'id'), 
            _.pluck(incoming, this.id));
        if (orphans.length) 
          this.destroy(orphans, _.extend({}, options, {clean:true}));
      }
      
      // Change phase
      this.flow();
      for (i= incoming.length-1; i >= 0; i--) {
        attrs = incoming[i];
        // Change record if it exists 
        if (_.has(attrs, this.id) && (record = this.get(attrs[this.id]))) {
          record.set(attrs, options);
          incoming.splice(i, 1);
        }
      }
      this.flow(true);

      // Add all rest
      this.flow();
      for (i=0, length = incoming.length; i < length; i++) {
        attrs = incoming[i];
        // Create new record or report error.
        try {
          record = new _Record(this, attrs, options.clean);
          
          // if record with id present in ghosts. dispose it
          if (existing = this.ghosts[record.id]) existing.dispose();
          
          ingest.push(record);
          this.ids[record.id] = record;
          
          // Bind events
          record.on('destroy', this._recordDestroy, this)
                .on('change', this._recordChange, this)
                .on('invalid', this._recordInvalid, this)
                .on('dispose', this._recordDispose, this);
          
          this.emit('create', record);
        } catch (e) {
          this.emit('invalid', {
            attributes: attrs,
            reason: e.message
          }, options);
        };
      }
      // splice
      if (ingest.length) {
        ingest.unshift(0);
        ingest.unshift(this.records.length);
      }
      Array.prototype.splice.apply(this.records, ingest);
      this.flow(true);
      return this;
    },
    
    /**
     * Destroy records.
     * @param {Array} ids Record IDs
     * @param {Object} options Options
     * @returns {Object} Model
     */
    destroy : function(ids, options) {
      options || (options = {});
      this.flow();
      _.each(_.pick(this.ids, ids), function(record) {
        record.destroy(options);
      }, this);
      this.flow(true);
      return this;
    },
    
    /**
     * Fetch data from persistence. By design, just emits "fetch" event 
     * with `options`.
     */
    fetch : function(options) {
      !options && (options = {});
      if (this._conduit) this._conduit.fetch(this, options);
      return this;
    },
    
    /**
     * Commit all changes (destroy, change, add) in persistence or cleans 
     * model.  
     * @param {Object} options Options
     */
    commit : function(options) {
      options || (options = {});
      var conduit;
      if (!options.clean && (conduit = this._conduit)) {
        // destroy first
        !_.isEmpty(this.ghosts) && conduit.destroy(this, _.keys(this.ghosts));
        var changes = _.groupBy(
            _.filter(this.records, 'dirty'), 
            function(record) {
              return record.fresh ? 'fresh' : 'dirty';
            });
        
        !_.isEmpty(changes.fresh) && conduit.create(this, changes.fresh);
        !_.isEmpty(changes.dirty) && conduit.change(this, changes.dirty);
        
      } else {
        this.conduitDestroy(null, this, _.keys(this.ghosts));
        this.conduitStore(null, this, 
            _.pluck(_.filter(this.records, 'dirty'), 'id'));
      }
      return this;
    },
    
    /**
     * 
     */
    income : function(attributes) {
      
    },
    
    outcome : function() {
      
    },
    
    //
    // Record event handlers. All internal.
    //
    
    /**
     * Model action on successful Record change. Just forward event.
     * @param {Object} record Record
     * @param {Object} previous Hash with previous values of changed
     *                 attributes
     */
    _recordChange : function(record, previous) {
      this.emit('change', {
        record: record,
        previous: previous
      });
    },
    
    /**
     * Model action on successful Record `destroy`.
     * @param {Object} record Record
     * @param options Options
     */
    _recordDestroy : function(record, options) {
      var index = _.indexOf(this.records, record);
      if (index != -1) {
        if (!options.clean || !record.fresh) this.ghosts[record.id] = record;
        // off events except dispose
        this.off('destroy change invalid', null, record);
        delete this.ids[record.id];
        this.records.splice(index, 1);
        this.emit('destroy', record);
      }
    },
    
    /**
     * Model action on invalidate new attributes. Just forward event.
     * @param record Record or `undefined` on record creation 
     * @param {Object} attributes Invalid attributes 
     * @param reason Reason
     * @param options Options
     */
    _recordInvalid : function(record, attributes, reason) {
      this.emit('invalid', {
        record: record,
        attributes: attributes,
        reason: reason
      });
    },
    
    /**
     * Model action on record dispose.
     * @param {Object} record Record
     */
    _recordDispose : function(record) {
      // If record exists - destroy it
      if (this.get(record.id)) record.destroy({clean:true});
      // do cleanup
      this.off(null, null, record);
      delete this.ghosts[record.id];
    },
    
    //
    // Conduit event handlers
    //
    
    /**
     * Model action on conduit fetch.
     * @param conduit Conduit
     * @param model Model that initiated fetch
     * @param {Array} data Fetched data
     */
    conduitFetch : function(conduit, model, data) {
      if (model !== this) return;
      this.set(this.income ? 
          _.map(data, function(attributes) {
            return this.income(_.clone(attributes));
          }, this) : data
          , {clean:true}); 
    },
    
    /**
     * Model action on conduit destroy. Default behaviour is just dispose 
     * ids from `ghosts`
     */
    conduitDestroy : function(conduit, model, ids) {
      if (model !== this) return;
      _.each(_.pick(this.ghosts, ids), function(ghost) {
        ghost.dispose();
      });
    },
    
    /**
     * Model action on conduit store. Default behaviour is just clean
     * `dirty` and `fresh` records with given ids. 
     * @param {Object} conduit Conduit
     * @param {Object} model Model
     * @param {Array} ids Ids of stored records
     */
    conduitStore : function(conduit, model, ids) {
      if (model !== this) return;
      var res, records = _.map(_.pick(this.ids, ids), function(record){
        if (record.dirty) {
          res = {}; res[this.id] = id;
          return res;
        }
      }, this);
      this.set(records, {clean:true});
    }
    
  });
  
  Model.extend = Ca.extend;
  
}).call(this);
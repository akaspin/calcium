/*
 * Calcium Model.
 * depends calcium.js
 */

(function(){
  var Ca = this.Ca;

  /*
   * Model
   * =====
   * 
   * Model holds records.
   */
  
  /*
   * Record
   * ------
   * 
   * Records is very skinny objects inside Models. Besides methods, record has 
   * three properties.
   * 
   * - `id` Unique ID inside Model. Assicned on creation. Immutable.
   * - `attributes` Record attributes
   * - `dirty` Flag that record isn't synchronized with persistence.
   */
  
  /**
   * Internal record constructor.
   * @param {Object} model Model
   * @param {Object} attributes Attributes
   * @param {Boolean} clean Already synced with persistence
   * @throws Error if attributes not pass `validate`;
   * @constructor
   */
  var Record = function(model, attributes, clean) {
    this.model = model;
    var invalid;
    if (model.validate && (invalid = model.validate.call(model, attributes))) 
      throw new Error(invalid);
    this.attributes = attributes;
    if (!clean) this.dirty = true;
    this.id = attributes[idAttr] || _.uniqueId();
  };
  
  // Record methods
  _.extend(Record.prototype, Ca.Events, {
    
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
      if (!invalid) invalid = _Record.validate.call(this, 
          _.extend({}, this.attributes, attributes));
      // If any invalid results emit "invalid event"
      if (invalid || (model.validate && 
          (invalid = model.validate.call(model, attributes)))) {
        this.emit('invalid', attributes, invalid);
        return this;
      }
      
      // All ok - set new
      var previous = {}, now = _.clone(this.attributes),
      oldDirty = this.dirty;
      _.forOwn(_.clone(attributes), function(key, value) {
        if (!_.has(now, key) || !_.isEqual(now[key], value)) {
          previous[key] = now[key];
          this.attributes[key] = value;
          this.dirty = true;
        }
      }, this);
      
      // On clean setting override `dirty` value
      options.clean && (delete this.dirty);
      
      // If any changes - set dirty flag and emit event
      if (!_.isEmpty(previous) || oldDirty != this.dirty) {
        this.emit('change', previous, this.dirty);
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
      this.emit('destroy', options);
      if (options.clean) this.dispose();
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
    // set props
    this.flowBy = ['destroy', 'change', 'create', 'invalid'];
    this.ids = {};
    this.records = [];
    options && _.extend(this, options);
    
    // fix conduit and attach if needed
    this.conduit = _.result(this, 'conduit');
    this.conduit && this.conduit.attach(this);
    
    // set dispose action
    this.dispose(function() {
      delete this.ghosts;
      delete this.ids;
      delete this.records;
    });
    
    // fire init
    this.init.apply(this, arguments);
  };
  
  // Model methods
  _.extend(Model.prototype, Ca.Flow, {
    
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
      
      var i, length, attrs, id, record, ingest = []; 

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
      for (i=0, length = incoming.length; i < length; i++) {
        attrs = incoming[i];
        // Change record if it exists 
        if ((id = attrs.id) && (record = this.get(id))) {
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
          record = new Record(this, attrs, options.clean);
          ingest.push(record);
          this.ids[record.id] = record;
          
          // Bind events
          record.on('destroy', _onRecordDestroy, this, true);
          record.on('change', _onRecordChange, this, true);
          record.on('invalid', _onRecordInvalid, this, true);
          
          this.emit('create', record);
        } catch (e) {
          this.emit('invalid', {
            attributes: attrs,
            reason: e.message
          }, options);
        };
      }
      this.records.concat(ingest);
      this.flow(true);
    },
    
    /**
     * Destroy records.
     * @param {Array} ids Record IDs
     * @param {Object} options Options
     * @returns {Object} Model
     */
    destroy : function(ids, options) {
      this.flow();
      var record;
      _.each(ids, function(id) {
        if (record = this.get(id)) record.destroy(options);
      }, this);
      this.flow(true);
    },
    
    /**
     * Fetch data from persistence. By design, just emits "fetch" event 
     * with self and `arguments`. Conduit must to bind on "fetch" on `attach`.
     */
    fetch : function(options) {
      if (this.conduit) this.emit('fetch', arguments);
      return this;
    },
    
    /**
     * Commit all changes (destroy, change, add) in persistence. 
     * 
     * @param {Object} options Options
     */
    commit : function() {
      options || (options = {});
      if (!options.clean || this.conduit) {
        // Emit "sync" event  
        this.emit('commit', arguments);
      } else {
        // Simple happy model or clean.
        _.each(this.ghosts, function(ghost) {
          ghost.dispose();
        }, this);
        delete this.ghosts;
        var res;
        this.set(_.map(_.filter(this.records, 'dirty'), function(record) {
          res = {};
          res[this.id] = record.id;
          return res;
        }, this), {clean:true});
      }
    },
    
    // Record event handlers
    
    /**
     * Model action on successful Record change. Just forward event.
     * 
     * @param {Object} record Record
     * @param {Object} previous Hash with previous values of changed
     *                 attributes
     * @param {Boolean} dirty Dirty flag
     */
    _onRecordChange : function(record, previous, dirty) {
      this.emit('change', {
        record: record,
        previous: previous,
        dirty: dirty
      });
    },
    
    /**
     * Model action on successful Record `destroy`.
     * @param {Object} record Record
     * @param options Options
     */
    _onRecordDestroy : function(record, options) {
      var index = this.records.indexOf(record);
      if (index != -1) {
        this.ghosts || (this.ghosts = []);
        if (options.clean) this.ghosts.push(record);
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
    _onRecordInvalid : function(record, attributes, reason) {
      this.emit('invalid', {
        record: record,
        attributes: attributes,
        reason: reason
      });
    }
  });
  
  Model.extend = Ca.extend;
  
}).call(this);
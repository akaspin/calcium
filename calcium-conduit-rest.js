/*
 * REST Conduit
 * depends conduit.js
 */

(function(){
  var Ca = this.Ca,
  $ = Ca.$;
  
  var REST = Ca.Conduit.REST = function(options) {
    this.setup(options);
  };
  
  _.extend(REST.prototype, Ca.Events, Ca.Conduit.Base, {
    requestDefaults : {
        contentType: 'application/json',
        dataType: 'json',
        processData: false,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
    },
    
    fetch : function(model, options) {
      var __this = this;
      return this._go(model, {
        type: 'GET',
        processData: true
      }, [options.data ? {data: options.data} : {}])
      .always(function(res) {
        console.log('fetch', res);
        __this.emit('fetch', model, options, res);
      });
    },
    
    destroy : function(model, ids) {
      console.log(ids);
      var __this = this;
      return this._go(model, {
        type: 'DELETE'
      }, _.map(ids, function(id) {
        return {id:id};
      }))
      .always(function(res) {
        model.
        console.log('destroy', arguments);
        __this.emit('destroy', model, res);
      });
      
    },
    
    create : function(model, fresh) {
      
    },
    
    /**
     * PUT
     * @param {Object} model
     * @param {Array} dirty
     */
    change : function(model, dirty) {
      
    },
    
    // Internal

    /**
     * Queue set of requests.
     * @param {Object} base Base request parameters. Mixed to defaults.
     * @param {Array} specs Requests specs. Spec is hash with two fields:
     * `id` and `data`. `id` is formely record id.
     *                
     */
    _go : function(model, base, specs) {
      // fix url and base defaults
      var _url = _.result(model, 'url') || _.result(this, 'url'),
          baseOpts = _.extend({}, this.requestDefaults, base),
          deferred = $.Deferred(), 
          promise = deferred.promise();
      
      var setUrl = _url ? 
          function(opts, id) {
            opts.url = !_.isUndefined(id) ? 
                [_url, encodeURIComponent(id)].join('/') : _url;
          } : function(opts, id) {
            !_.isUndefined(id) && (opts.url = encodeURIComponent(id));
          };
      
      // Burst all
      var burst = function(next) {
        var res = {
            success : [],
            error : []
        };
        return $.when.apply($, _.map(specs, function(spec) {
          var opts = {}, id = spec.id;
          spec.data && (opts.data = spec.data);
          setUrl(opts, id);
          
          return $.ajax(_.extend({}, baseOpts, opts))
            .done(function(data) {
              res.success.push({data: data, id: id});
            })
            .fail(function(xhr) {
              res.error.push({id: id, data: xhr.status});
            });
        })).always(function() {
          deferred.resolve(res);
        }).then(next, next);
      };
      
      this.queue(burst);
      return promise;
    }
    
  });
  
  REST.extend = Ca.extend;
  
}).call(this);
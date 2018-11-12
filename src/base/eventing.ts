/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// A set of helpers to define eventing methods on objects
qdInternal.eventing = {

    // Add event registration method to the object
    // @param [String] eventType the type of event
    // @param [Function] callback the callback to call
    _on(eventType, callback) {
        let registrations = this.__eventRegistrations != null ? this.__eventRegistrations : (this.__eventRegistrations = {});

        if (registrations[eventType] == null) { registrations[eventType] = []; }
        registrations[eventType].push(callback);

        // dont return array
    },

    // Adds an event registration that will only be called once
    // and after called it will unregister
    // @param [String] eventType the type of event
    // @param [Function] callback the callback to call
    _once(eventType, callback) {
        var wrappedCallback = function(...args) {
            callback.apply(this, arguments);
            return this.removeListener(eventType, wrappedCallback);
        }.bind(this);

        // register through previous handler
        this.on(eventType, wrappedCallback);

        // dont return registration
    },

    // Remove event registration method from the object
    // @param [String] eventType the type of event
    // @param [Function] callback the callback to call
    _removeListener(eventType, callback) {
        let registrations = this.__eventRegistrations;

        if ((registrations != null ? registrations[eventType] : undefined) != null) {
            // remove the callback
            registrations[eventType] = (registrations[eventType].filter((reg) => reg !== callback));
        }

        // dont return result
    },

    // Emit an event on this object
    // @param [String] eventType the type of event to emit
    // @param [Array] args a set of arguments to pass
    // @param [Boolean] async whether or not to perform this emit async
    _emit(eventType, args, async = true) {
        // only attempt an emit if registrations exist
        if ((this.__eventRegistrations == null) || (this.__eventRegistrations[eventType] == null)) { return; }

        // capture the callback array so callbacks can be removed
        // while traversing and not affect the loop
        let callbacks = this.__eventRegistrations[eventType];
        let emitCallback = () => {
            for (let callback of callbacks) {
                callback.apply(this, args);
            }

            // prevent return
        };

        if (async) {
            qdInternal.async.immediate(emitCallback);
        } else {
            emitCallback();
        }

        // prevent return catch
    },

    // Takes the given element and adds the eventing methods to it
    // @param [Object] obj an object to add eventing methods to
    add(obj) {
        let evt = qdInternal.eventing;

        // Map methods to the object, they use `this` references to access the
        // registrations so new closures are not generated every time.
        // 
        // Notice we are not creating the registrations object, this will be
        // created on demand to avoid unnecessary object creation.
        obj.on = evt._on;
        obj.once = evt._once;
        obj.removeListener = evt._removeListener;
        obj.emit = evt._emit;

        // return object for convenience but not necessary
        return obj;
    }
        
};

// add eventing directly to quickdraw
qdInternal.eventing.add(qd);

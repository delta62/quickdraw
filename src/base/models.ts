/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Functions associated with model manipulation within Quickdraw
qdInternal.models = {
    // Converts a model into a quickdraw model if it
    // is not already one, this lets primitive content
    // become models where normally they cannot
    // @param [Object] rawObject a raw data model
    // @return [Object] qdmodel that encapsulates the given raw model
    create(rawObject) {
        if (this.isModel(rawObject)) { return rawObject; }

        // Construct a new model wrapper
        return {
            raw : rawObject,
            __isModel : true,
            __parent : null
        };
    },

    // Tells whether or not an object is a model
    // @param [Object] an object to check if it is a model
    // @return [Boolean] whether or not given object is an internal quickdraw model
    isModel(object) {
        return (object != null) && (object.__isModel != null) && object.__isModel;
    },

    // Gives the internal binding model for a given dom node if there is one
    // @param [DomNode] domNode the node that has been previously bound
    // @return [Object] a quickdraw object that was bound to the node
    //                  null if the given node was not bound
    get(domNode) {
        return qdInternal.storage.getInternalValue(domNode, qd.getConfig('baseModelKey'));
    },

    // Sets the parent of the given model
    // @param [Object] model the model to set the parent of
    // @param [Object] parent the object to be the parent of this model
    // @note if the given model is not a model, nothing is done
    setParent(model, parent) {
        // we cannot set a parent if:
        // - the given object is not a model
        // - the given parent does not exist
        // - the model and parent are the same thing (cyclic models are bad)
        if (!this.isModel(model) || (parent == null) || (model === parent)) { return; }
        return model.__parent = parent;
    },

    // Gets the parent of the given model
    // @param [Object] model the model to get the parent of
    // @return the parent model of the given if there is one
    //         null otherwise
    getParent(model, parent) {
        if (!this.isModel(model)) { return null; }
        return model.__parent;
    },

    // Unwraps a quickdraw model if given one
    // @param [Object] model a possible quickdraw model to be unwrapped
    // @return The unwrapped model if the given object is a quickdraw model
    //         otherwise the given object is returned
    unwrap(model) {
        if (this.isModel(model)) {
            return model.raw;
        }
        return model;
    }
};

// For a given dom node this method returns the model bound to the dom node
// @param [DomNode] domNode the node that has been previously bound
// @return [Object] a raw javascript object that was bound to the node
//                  null if the given node was not bound
qd.getModel = domNode => qdInternal.models.unwrap(qdInternal.models.get(domNode));

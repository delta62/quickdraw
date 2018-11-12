/*
 * decaffeinate suggestions:
 * DS103: Rewrite code to no longer use __guard__
 * DS104: Avoid inline assignments
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Utility functions for handling storage on nodes
qdInternal.storage = {
    // Stores a quickdraw associated value on the node as an internal
    // storage value
    // @param [VirtualDomNode/DomNode] node a node to store the value on
    // @param [String] name the name of the value to store
    // @param [Object] value the value to store on the node
    // 
    // @note this method should not be used outside of the core of quickdraw
    // @note virtual nodes will be correctly unwrapped
    setInternalValue(node, name, value) {
        this.setValue(qdInternal.dom.unwrap(node), name, value, '_');
    },

    // Returns a value from a node that is stored as an internal value
    // @param [VirtualDomNode/DomNode] node a node to get the value from
    // @param [String] name the name of the value to get
    // 
    // @note this method should not be used outside of the core of quickdraw
    // @note virtual nodes will be correctly unwrapped
    getInternalValue(node, name) {
        return this.getValue(qdInternal.dom.unwrap(node), name, '_');
    },

    // Stores a value related to the node for a handler
    // @param [DomObject] node the node related to the value to store
    // @param [String] name the name of the value to store
    // @param [Object] value the value to store
    // @param [String] namespace the name of the storage area to group be
    //                             automagically set to your handlers name by default
    //                             
    // @note it is extremely rare that you would want to specify a non default
    //       value for the 4th parameter, but if you want to share storage
    //       between handlers that would be one easy way to do it
    setValue(node, name, value, namespace = qdInternal.state.current.handler) {
        let storageKey = qd.getConfig('nodeDataKey');
        if (node[storageKey] == null) { node[storageKey] = {}; }
        if (node[storageKey][namespace] == null) { node[storageKey][namespace] = {}; }
        node[storageKey][namespace][name] = value;
    },

    // Retrieves a value related to the given node for a handler
    // @param [DomObject] node the node related to the value to retrieve
    // @param [String] name the name of the value to retrieve
    // @return [Object] the originally stored object, null if there is none
    // @param [String] namespace the name of the storage area to group by
    //                             automagically set to your handlers name by default
    // 
    // @note it is extremely rare that you would want to specify a non default
    //       value for the 4th parameter, but if you want to share storage
    //       between handlers that would be one easy way to do it
    getValue(node, name, namespace = qdInternal.state.current.handler) {
        let left;
        return (left = __guard__(__guard__(node[qd.getConfig('nodeDataKey')], x1 => x1[namespace]), x => x[name])) != null ? left : null;
    },

    // Removes all handler stored values on the given node
    // @param [DomObject] node the node that we want to clear all the values off of
    // @note virtual dom objects will be correctly unwrapped
    clearValues(node) {
        let storageKey = qd.getConfig('nodeDataKey');
        if (node[storageKey] == null) { return; }
        delete node[storageKey];
        // ensure we dont return the deleted data
    }
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
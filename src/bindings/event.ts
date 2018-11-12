/*
 * decaffeinate suggestions:
 * DS104: Avoid inline assignments
 * DS203: Remove `|| {}` from converted for-own loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Quickdraw Handler - Event Listeners
// 
// Registration Name: event
// 
// Description:
//   Enables listening for specified events on specified nodes. Unlike normal listening
//   each DOM node does not have listeners attached and instead only singular global
//   listeners are registered for performance.
//   
//   When events are dispatched the callback supplied through the binding string is given
//   the original binding context and the original DOM event that triggered the callback.
//   
// Handles Child Node Bindings: No
// 
// Possible Binding Data:
//   [Object]     A javascript object where the keys are event names and the values
//                are callbacks that should be executed when the event occurs with
//                the corresponding DOM node as a target.
let dispatchEvent = function(event) {
    // start at the event target and work our way up
    let currentTarget = event.target;
    let eventName = event.type;
    let callback = null;
    while ((currentTarget != null) && (callback == null)) {
        callback = this.storage.getValue(currentTarget, eventName, 'event');
        if (callback == null) {
            currentTarget = currentTarget.parentElement;
        }
    }

    if (callback != null) {
        // we are going to propagate on our own if there is a callback.
        event.stopPropagation();

        let context = this.context.get(currentTarget);
        // run the callback, look for explicit truth return
        if (callback(context, event) !== true) {
            // cancel the default event action
            event.preventDefault();
        }
    }

    // dont capture loop results
    return true;
};


qd.registerBindingHandler('event', {
    initialize(bindingData, node) {
        // get the owning document for our global event references
        let left;
        let document = node.getProperty('ownerDocument');
        let globalRegistry = (left = this.storage.getValue(document, 'registry')) != null ? left : {};

        for (let eventName of Object.keys(bindingData || {})) {
            let callback = bindingData[eventName];
            if (callback == null) { continue; }

            // ensure we have globally registered for the event on this document
            if (globalRegistry[eventName] == null) {
                globalRegistry[eventName] = event => dispatchEvent.call(this, event);
                document.addEventListener(eventName, globalRegistry[eventName], true);
            }

            // store callback on this node for event
            node.setValue(eventName, callback);
        }

        // store the global registry on the document
        this.storage.setValue(document, 'registry', globalRegistry);

        // events should always have access to the binding context but that wont
        // be set if the element is just a simple element, so we do it manually
        // just in case there is no dynamic data
        if (this.state.current.model != null) {
            this.context.set(node, this.state.current.model);
        }

        // dont capture results of loops
    }
});
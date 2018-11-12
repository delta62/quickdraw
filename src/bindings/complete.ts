/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Quickdraw Handler - Binding Complete Callback
// 
// Registration Name: complete
// 
// Description:
//   Guarantees that the given callback will be called by quickdraw after
//   the node this handler is on and its children have been bound
//
// Handles Child Node Bindings: No
// 
// Possible Binding Data:
//   [Function]  a function that will be called with the DOM node for the data-bind

qd.registerBindingHandler('complete', {
    initialize(bindingData, node, bindingContext) {
        if (typeof bindingData !== 'function') {
            let error = new this.errors.QuickdrawError("Binding data for complete handler must be a callback function");
            error.setBindingContext(bindingContext);
            return this.errors.throw(error);
        }

        // setup async callback that will be called once main binding is complete
        return this.async.immediate(() => bindingData());
    }
});

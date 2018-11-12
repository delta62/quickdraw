/*
 * decaffeinate suggestions:
 * DS104: Avoid inline assignments
 * DS203: Remove `|| {}` from converted for-own loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Quickdraw Handler - Attribute Modifier
// 
// Registration Name: attr
// 
// Description:
//   Sets the attributes on a DOM element using the data from a binding
//   context. Data that is wrapped as an observable will be updated
//   when a change is made to the observable.
//
// Handles Child Node Bindings: No
// 
// Possible Binding Data:
//   [Object]    a javascript object where the keys are valid DOM attributes
//               and the values are the values to be assigned for those attributes.
//               Any values that are observables will be properly extracted
//               and registered for updates
qd.registerBindingHandler('attr', {
    update(bindingData, node) {
        // for each attribute specified, go through and add them to the node
        let left;
        let boundAttributes = (left = node.getValue('attributes')) != null ? left : {};
        let object = qd.unwrapObservable(bindingData);
        for (let attrName of Object.keys(object || {})) {
            let value = object[attrName];
            let newValue = qd.unwrapObservable(value);
            let oldValue = node.getAttribute(attrName);
            boundAttributes[attrName] = true;

            if ((newValue != null) && (oldValue !== newValue)) {
                node.setAttribute(attrName, newValue);
            } else if ((newValue == null)) {
                node.removeAttribute(attrName);
            }
        }

        node.setValue('attributes', boundAttributes);

        // can descend past here
        return true;
    },

    cleanup(node) {
        let object = node.getValue('attributes');
        for (let attrName in object) {
            let value = object[attrName];
            node.removeAttribute(attrName);
        }
        // prevent loop captures
    }
});

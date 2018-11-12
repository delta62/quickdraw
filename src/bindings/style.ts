/*
 * decaffeinate suggestions:
 * DS203: Remove `|| {}` from converted for-own loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Quickdraw Handler - CSS style attribute modifier
// 
// Regstration Name: style
// 
// Description:
//   Sets the style attributes of a DOM element using the data supplied
//   by a binding context for the element. Data that is provided by an
//   observable will be updated when a change is made to the observable
//   
// Handles Child Node Bindings: No
// 
// Possible Binding Data:
//   [Object]    a javascript object where the keys are valid CSS attributes
//               that are in camel case notation ('backgroundColor' not
//               'background-color'). Any values that are observables will
//               be properly extracted and registered for updates.

qd.registerBindingHandler('style', {
    update(bindingData, node) {
        // we will store the changes that occur within an object called changes
        // this is because the virtual dom will not try to interpret the values
        // set via setAttribute/getAttribute so simply dropping values in will
        // not correctly reset a node, instead we need to set them to their old values
        // 
        // we also delay the creation of this object to reduce the object churn
        let changes = node.getValue('changes');

        // Set the styles specified in binding data on the node
        for (let styleName of Object.keys(bindingData || {})) {
            // parse new value into unified form, this is most useful for urls
            // that will be auto completed by the styling engine
            let value = bindingData[styleName];
            let newValue = qd.unwrapObservable(value);
            let oldValue = node.getStyle(styleName);

            // only update if value changed
            if (oldValue !== newValue) {
                if (changes == null) { changes = {}; }
                if (changes[styleName] == null) { changes[styleName] = oldValue; }
                node.setStyle(styleName, newValue);
            }
        }

        if (changes != null) {
            node.setValue('changes', changes);
        }

        // Allowed to continue after this
        return true;
    },

    cleanup(node) {
        // restore original values back to the node
        let changes = node.getValue('changes');
        if (changes != null) {
            for (let key in changes) {
                let value = changes[key];
                node.setStyle(key, value);
            }
        }

    }
});

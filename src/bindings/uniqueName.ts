/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Quickdraw Handler - Unique Namer
// 
// Registration Name: uniqueName
// 
// Description:
//   Assigns a globally unique node name to the DOM node associated
//   with this binding handler. Note that names are unique to quickdraw
//   instances, so unless quickdraw persists across web pages loads, their
//   could be overlaps on different pages
//   
// Handles Child Node Bindings: No
// 
// Possible Binding Data:
//   None
qd.registerBindingHandler('uniqueName', {
    initialize(bindingData, node) {
        // get unique id for node
        let nodeId = this.dom.uniqueId(node);

        // give the node a unique name
        return node.setAttribute('name', `qd_${nodeId}`);
    }
});

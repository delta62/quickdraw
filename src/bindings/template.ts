/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Quickdraw Handler - Template
//
// Registaration Name: template
//
// Description:
//   Inserts the nodes corresponding to a template that has been registered
//   with the quickdraw library. This handler will not perform any custom 
//   binding on the template which means the template will be bound in the
//   same context as the node containing this binding unless a 'with' binding
//   is also used. 
//   
// Handles Child Node Bindings: No
//
// Possible Binding Data:
//   [String]  The name of the template that should be injected into this node

qd.registerBindingHandler('template', {
    initialize(templateName, containerNode, bindingContext) {
        templateName = qd.unwrapObservable(templateName);

        if (templateName == null) { return true; }

        // check for the specified template exists
        if (!this.templates.exists(templateName)) {
            let error = new this.errors.QuickdrawError(`Given template \`${templateName}\` has not been registered with Quickdraw`);
            error.setBindingContext(bindingContext);
            return this.errors.throw(error);
        }

        // get a copy of the template
        containerNode.setValue('template', templateName);
        let templateNodes = this.templates.get(templateName, containerNode.getProperty('ownerDocument'));

        // set the new children
        containerNode.setChildren(templateNodes);

        // allow binding to go to children
        return true;
    },

    cleanup(node) {
        // unbind all the children
        let children = node.getChildren();
        for (let child of children) {
            this.binding.unbindDomTree(child);
        }

        // return the template to the pool
        let templateName = node.getValue('template');
        this.templates.return(templateName, children);

        // remove the template data
        node.clearChildren();

    }
});
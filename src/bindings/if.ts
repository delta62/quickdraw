/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Quickdraw Handler - If
// 
// Registration Name: if
// 
// Description:
//   This binding adds/removes the child dom structure based off of the truthy value given
//   to the binding handler
//   
// Handles Child Node Binding: Yes
// 
// Possible Binding Data:
//  [Boolean]   A boolean value as to whether or not the child dom tree should be included
//              in the dom tree

qd.registerBindingHandler('if', {
    initialize(bindingData, node) {
        // store off the original template
        let children = node.getChildren();

        // If the children already come from a template, return them to that pool
        // Otherwise, create a template from them.
        let templateName = children[0] != null ? children[0].getTemplateName() : undefined;
        if (templateName != null) {
            this.templates.return(templateName, children);
        } else {
            templateName = this.templates.register(children);
        }

        // set the template name so we can reference it later
        node.setValue('template', templateName);
        node.setValue('hasNodes', false);

        // specify model on node so non-observable values can correctly reference the model
        this.context.set(node, this.state.current.model);

        // clear out the children
        return node.clearChildren();
    },

    update(bindingData, node, bindingContext) {
        let child;
        let truthValue = qd.unwrapObservable(bindingData);
        let templateName = node.getValue('template');
        let hasNodes = node.getValue('hasNodes');
        let children = node.getChildren();

        if (truthValue && !hasNodes) {
            // need to add the nodes back and bind
            node.setChildren(this.templates.get(templateName, node.getProperty('ownerDocument')));

            // bind the children
            for (child of node.getChildren()) {
                if (child.getProperty('nodeType') === 1) {
                    // call bindDomTree because context and data isnt changing
                    this.binding.bindModel(this.models.get(node), child, bindingContext);
                }
            }

            node.setValue('hasNodes', true);
        } else if (!truthValue && hasNodes) {
            // need to unbind nodes and remove
            for (child of children) {
                qd.unbindModel(child);
            }

            // return the template
            this.templates.return(templateName, children);
            node.clearChildren();
            node.setValue('hasNodes', false);
        }

        // we took care of binding the children
        return false;
    },

    cleanup(node) {
        let hasNodes = node.getValue('hasNodes');
        let templateName = node.getValue('template');

        // add nodes back if they are missing now
        if (!hasNodes) {
            node.setChildren(this.templates.get(templateName, node.getProperty('ownerDocument')));
        }

        // let the main unbind routine handle the unbinding
    }
}, ["template"]);

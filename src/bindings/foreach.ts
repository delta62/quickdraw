/*
 * decaffeinate suggestions:
 * DS104: Avoid inline assignments
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Quickdraw Handler - Foreach Handler
//
// Registration Name: foreach
//
// Description:
//   Given an array of similar models, this handler will duplicate the child nodes
//   of the DOM element associated with this handler and bind each model one by one
//   to them. The context in which each child is bound is a 'child' context of the
//   current node's binding context. To access the foreach node's context you can
//   use the $parent attribute on the new context. In addition you can find out the
//   numeric value of the child with the special $index value that will be added
//   to the child context by this handler.
//
//   In the case of an observable array the dependencies will be registered for updates
//   and in the event of an update only the modified elements in the array will
//   be modified by the foreach adapter. Any elements that have remain unchanged
//   will not be recreated by the handler.
//
// Handles Child Node Bindings: Yes
//
// Possible Binding Data:
//   [Array]     A javascript array or quickdraw observable array that contains a
//               set of models. Each model will be bound, in the order specified
//               to clones of the HTML specified within the node associated with
//               the foreach handler
//
// @note All caching for the foreach handler is stored on the node that contains
// the foreach binding attribute. Thus if that node is destroyed the cache will
// be appropriately cleaned up as well.
qd.registerBindingHandler('foreach', {
    initialize(bindingData, node) {
        // register the template with the templating system
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
        node.setValue('childTemplate', templateName);

        // clear out the children to empty this node
        node.clearChildren();

    },

    update(bindingData, node, bindingContext) {
        // grab a reference to the document - do not cache globally, there could be multiple
        let child, leftover, model, modelTemplate, nodeGroup, useTemplatesFromModels;
        let doc = node.getProperty('ownerDocument') || document;
        let templateName = node.getValue('childTemplate');

        // unwrap the binding data
        let rawBindingData = qd.unwrapObservable(bindingData);

        // check if we were given a configuration object
        if (!(rawBindingData instanceof Array)) {
            useTemplatesFromModels = rawBindingData.templatesFromModels;
            rawBindingData = qd.unwrapObservable(rawBindingData.data);
        }

        if (useTemplatesFromModels == null) { useTemplatesFromModels = false; }

        // create an array to store the binding pieces in
        let pieces = {};

        // grab the current children
        let currentChildren = node.getChildren();
        let groupStartIndex = 0;
        while (groupStartIndex < currentChildren.length) {
            child = currentChildren[groupStartIndex];
            let index = child.getValue('index');
            // we only care about a node if it has an index, otherwise we didnt add it
            if (index != null) {
                // figure out all the nodes that are in this group
                nodeGroup = [];
                let curPos = groupStartIndex;
                while ((curPos < currentChildren.length) && (currentChildren[curPos].getValue('index') === index)) {
                    nodeGroup.push(currentChildren[curPos++]);
                }

                // get the model bound to these children, it will be the same among all
                model = child.getValue('model');
                modelTemplate = nodeGroup[0].getTemplateName();

                // check if the model is in the new binding data
                let newIndex = rawBindingData.indexOf(model);
                if (newIndex !== -1) {
                    // model was reused, save its information off to reuse it
                    pieces[newIndex] = {
                        model,
                        indexChanged  : newIndex !== index
                    };

                    // grab the template from the model if possible
                    let declaredTemplate = qd.unwrapObservable(rawBindingData[newIndex].template);

                    // convert to internal name, all names must be registered at this point
                    declaredTemplate = this.templates.resolve(declaredTemplate);

                    // check if we want to return or reuse the template nodes
                    if (!useTemplatesFromModels || (modelTemplate === declaredTemplate)) {
                        // the template is the same, reuse the nodes
                        pieces[newIndex].nodes = nodeGroup;
                    }
                }

                // return the old nodes if they were not stored off
                if ((pieces[newIndex] != null ? pieces[newIndex].nodes : undefined) == null) {
                    // this model was not used, cleanup and remove nodes
                    for (leftover of nodeGroup) {
                        // unbind the element from any dependencies
                        qd.unbindModel(leftover);
                    }

                    // return the template to the pool
                    this.templates.return(modelTemplate, nodeGroup);
                }

                // remove node from observable dependency if it was added
                if ((newIndex === -1) && qd.isObservable(model.template)) {
                    this.observables.removeDependency.call(model.template, node);
                }

                // increment groupStartIndex by the number of nodes processed
                groupStartIndex += nodeGroup.length;
            } else {
                // increment groupStartIndex by one to move along the array
                groupStartIndex++;
            }
        }

        let newChildren = [];
        // compute the new children
        for (let i = 0; i < rawBindingData.length; i++) {
            // determine the name of the template for this model data
            model = rawBindingData[i];
            modelTemplate = templateName;
            if (useTemplatesFromModels) {
                if (model.template == null) {
                    this.errors.throw(new QuickdrawError("Foreach told to use template from model but model does not specify one"));
                }
                modelTemplate = qd.unwrapObservable(model.template);
                // if model.template is an observable we manually register the foreach as a dependency
                if (qd.isObservable(model.template)) {
                    this.observables.addDependency.call(model.template, this.models.get(node), node, 'foreach');
                }
            }

            // get the data for this piece
            let nodes = (pieces[i] != null ? pieces[i].nodes : undefined) != null ? (pieces[i] != null ? pieces[i].nodes : undefined) : this.templates.get(modelTemplate, doc);
            let indexChanged = (pieces[i] != null ? pieces[i].indexChanged : undefined) != null ? (pieces[i] != null ? pieces[i].indexChanged : undefined) : true;
            let nodesReused = ((pieces[i] != null ? pieces[i].nodes : undefined) != null);

            // go over the children and correctly update their state
            for (child of nodes) {
                child.setValue('index', i);
                child.setValue('model', model);

                // add the child to the new child order
                newChildren.push(child);

                // if nodetype 1 we actually want to bind the children
                if (child.getProperty('nodeType') === 1) {
                    if (nodesReused && indexChanged) {
                        // if these are old nodes and the index has changed update the observable
                        let context = child.getValue('context');
                        context.$index(i);
                    } else if (!nodesReused) {
                        // otherwise we have not reused nodes, we need to bind everything
                        let nextModel = this.models.create(model);
                        let childContext = bindingContext.$extend(nextModel);
                        childContext.$index = qd.observable(i);
                        this.binding.bindModel(nextModel, child, childContext);
                        child.setValue('context', childContext);
                    }
                }
            }
        }

        // update the nodes children
        node.setChildren(newChildren);

        // cleanup references
        rawBindingData = null;
        pieces = null;
        nodeGroup = null;
        child = null;
        node = null;
        leftover = null;

        // Should not continue binding any further
        return false;
    },

    cleanup(node) {
        let child, nodeGroup;
        let templateName = node.getValue('childTemplate');
        let children = node.getChildren();
        let groupStartIndex = 0;
        while (groupStartIndex < children.length) {
            child = children[groupStartIndex];
            let index = child.getValue('index');

            if (index != null) {
                // nodes with indicies should be grouped back into their templates and returned
                var left;
                nodeGroup = [];
                let curPos = groupStartIndex;
                while ((curPos < children.length) && (children[curPos].getValue('index') === index)) {
                    nodeGroup.push(children[curPos++]);
                }

                // store the group template name before unbinding
                let groupTemplate = (left = child.getTemplateName()) != null ? left : templateName;

                // unbind all the nodes in the group
                for (let dispose of nodeGroup) {
                    qd.unbindModel(dispose);
                }

                // return template to the cache
                this.templates.return(groupTemplate, nodeGroup);

                // increment groupStartIndex
                groupStartIndex += nodeGroup.length;

            } else {
                // nodes without indicies can be left alone, but we need to increment
                groupStartIndex++;
            }
        }


        // get a copy of the original children and set them to be the children of this node
        let originalChildren = this.templates.get(templateName, node.getProperty('ownerDocument'));
        node.setChildren(originalChildren);

        // free all child references
        children = null;
        child = null;
        nodeGroup = null;

        // prevent leak of nodes
    }

}, ["template"]);

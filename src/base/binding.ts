/*
 * decaffeinate suggestions:
 * DS104: Avoid inline assignments
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Functions related to model/dom binding
qdInternal.binding = {

    // Parses the binding function associated with the given node
    // @param [DomElement] a node that could have a binding function
    // @return [mixed]  a function that can be called with an approrpriate context
    //                       if the given node does have a binding function
    //                  null if the given node does not have a binding function
    getBindingFunction(node) {
        // If a node cant have an attribute, exit
        if ((node != null ? node.getAttribute : undefined) == null) {
            return null;
        }

        // grab the binding string from the node
        let bindingString = node.getAttribute(qd.getConfig('bindingAttribute'));

        // if there is no binding string, no bindings necessary
        if (bindingString == null) { return null; }

        // build a function if not already cached
        if (qdInternal.state.binding.functions[bindingString] == null) {
            // build the binding function since we haven't before
            let toParse = bindingString;
            if (bindingString.trim()[0] !== '{') {
                toParse = `{${toParse}}`;
            }

            //Reserved words not allowed as property names until ECMA 5
            toParse = toParse.replace(/(with|if)\s*:/g, '\'$1\' :');

            // notice we evaluate with the $context object, but this always
            // internally has a $data object, which we also want to bind with
            // so we can say $data directly inside and have the correct object
            // as it will look into the $context object to find the $data object
            let functionBody = 'with($context) {' +
                           '    with($data) {' +
                           '        return ' + toParse +
                           '    }' +
                           '}';
            let bindingFunction = null;
            try {
                bindingFunction = new Function('$context', '$element', functionBody);
            } catch (err) {
                let error = new QuickdrawError(`Error in parsing binding '${toParse}', ${err.message}`);
                error.setOriginalError(err);
                error.setDomNode(node);
                return qdInternal.errors.throw(error);
            }
            qdInternal.state.binding.functions[bindingString] = bindingFunction;
        }

        // return the binding function
        return qdInternal.state.binding.functions[bindingString];
    },

    // Gets the binding function for the given dom node and evaluates it in the given binding context
    // @param [VirtualDomNode] domNode the node to get the binding string of
    // @param [Object] bindingContext the context to use in evaluating the node
    // @return [Object] the result of the binding function if there is one, null otherwise
    getEvaluatedBindingObject(domNode, bindingContext) {
        // get the binding function for this node
        let bindingFunction = this.getBindingFunction(domNode);

        // if there is no binding function return now
        if (bindingFunction == null) { return null; }

        try {
            // pass the real dom node to the binding function as the $element value
            return bindingFunction(bindingContext, qdInternal.dom.unwrap(domNode));
        } catch (err) {
            let error = new QuickdrawError(`'${err.message}' in binding '${domNode.getAttribute(qd.getConfig('bindingAttribute'))}'`, err);
            error.setBindingContext(bindingContext);
            qdInternal.errors.throw(error);
            return null;
        }
    },

    // Applies a recursive binding with the given binding context
    // @note this should not be called from outside of quickdraw or a
    //       registered binding handler
    // @param [Object] viewModel a raw javascript object that contains
    //                           bindable attributes
    // @param [VirtualDomNode] domRoot     a root in the dom tree to bind to
    // @param [Object] context   the context to use when binding
    // @throw Exception if view model or dom root or context is null
    bindModel(viewModel, domRoot, context) {
        if (viewModel == null) {
            return qdInternal.errors.throw(new QuickdrawError('Attempting binding of a null View Model'));
        }
        if (domRoot == null) {
            return qdInternal.errors.throw(new QuickdrawError('Attempting to bind to a null Dom Root'));
        }
        if (context == null) {
            return qdInternal.errors.throw(new QuickdrawError('Attempting binding with a null context'));
        }
        if (!qdInternal.models.isModel(viewModel)) {
            return qdInternal.errors.throw(new QuickdrawError('Internal binding called with non-qd view model, must use models.create'));
        }

        // virtualize the dom node if its not already
        domRoot = qdInternal.dom.virtualize(domRoot);

        // store previous as this could be recursive
        qdInternal.models.setParent(viewModel, qdInternal.state.current.model);
        let stateMemento = qdInternal.updateCurrentState({
            model : viewModel
        });

        // update the views that this view model is part of
        this.bindDomTree(domRoot, context);

        // assert that viewModel is @_state.binding.model so that
        // we didnt jump out of a recursive without reseting
        if (viewModel !== qdInternal.state.current.model) {
            let error = new QuickdrawError('After updating view, view model and applying bindings no longer match');
            error.setBindingContext(context);
            error.setDomNode(domRoot);
            error.setViewModel(viewModel);
            qdInternal.errors.throw(error);
        }

        // revert to previous model
        stateMemento();

        // dont return model
    },

    // Binds the given element root with the given binding context
    // The children of the current element will be bound with the same
    // binding context unless a binding handler terminates the binding
    // @param [VirtualDomNode] a dom element with or without children to bind
    // @param [Object] a binding context to apply
    bindDomTree(domRoot, bindingContext) {
        // apply to the current node the binding context values
        if (this.bindDomNode(domRoot, bindingContext)) {
            // continue applying to children
            for (let child of domRoot.getChildren()) {
                this.bindDomTree(child, bindingContext);
            }
        }

        // prevent loop capture
    },

    // Applys any applicable binding handlers to the given node using the given context
    // @param [VirtualDomNode] domRoot a dom element that may require binding
    // @param [Object] bindingContext  the context to be given to the binding function
    // @return  whether or not the child elements of this node should be parsed
    bindDomNode(domNode, bindingContext) {
        // keep track of whether or not we should continue binding beyond this node
        // typically this will be true, but it is possible for binding handlers to
        // handle the binding of children
        let shouldContinue = true;

        // update the current state
        let stateMemento = qdInternal.updateCurrentState({
            element : domNode,
            handler : null
        });

        // attempt to get the evaluated binding object for this node
        let bindingObject = this.getEvaluatedBindingObject(domNode, bindingContext);

        if (bindingObject == null) {
            // no binding object restore the state and move on
            stateMemento();
            return shouldContinue;
        }

        // initialize all binding handlers on the node and mark them as dirty for updates
        let handlers = {};
        for (let name of qdInternal.state.binding.order) {
            // skip this handler if the binding object doesnt have any value for it
            if (!bindingObject.hasOwnProperty(name)) { continue; }

            let initialize = qdInternal.handlers.getInitialize(name);
            if (typeof initialize === 'function') {
                initialize(bindingObject[name], domNode, bindingContext);
            }

            // add handler to list of used ones and mark it dirty to start
            handlers[name] = true;
        }

        // store the handlers that this node has for quick reference to dirty state
        qdInternal.storage.setInternalValue(domNode, 'handlers', handlers);

        // since all handlers were considered dirty, update the dom node
        // pass down our binding object so we don't have to evaluate the function twice
        shouldContinue = this.updateDomNode(domNode, bindingContext, bindingObject);

        // restore the previous state
        stateMemento();

        return shouldContinue;
    },

    // For the given node it runs the update function of any handlers that have been
    // marked as dirty on the dom node.
    // @param [DomNode] domNode the node that should be updated
    // @param [Object] bindingContext the context that the node should be evaluated in
    // @param [Object] bindingObject (optional) this parameter allows an already evaluated
    //                               binding object to be used instead of the result of the
    //                               binding function on the node.
    // @return [Boolean] whether or not the caller needs to traverse to the child nodes
    // @note the usual case will not provide a bindingObject but it is provided by the
    // original binding phase to prevent double evaluation of binding functions
    updateDomNode(domNode, bindingContext, bindingObject = null) {
        // keep track of whether or not we should bind the children of this node
        let shouldContinue = true;

        // update the current state
        let stateMemento = qdInternal.updateCurrentState({
            element : domNode,
            handler : null
        });

        // get the binding object if its not already been defined
        if (bindingObject == null) { bindingObject = this.getEvaluatedBindingObject(domNode, bindingContext); }

        if (bindingObject == null) {
            // no binding object, restore the state and move on
            stateMemento();
            return shouldContinue;
        }

        // get the handlers for this node
        let handlers = qdInternal.storage.getInternalValue(domNode, 'handlers');
        for (let handler of qdInternal.state.binding.order) {
            // only run the handler if it has been previously marked as dirty
            var left;
            if (!handlers[handler]) { continue; }

            // get the update method for the handler
            let update = qdInternal.handlers.getUpdate(handler);

            // run update for handler, capture the should continue value
            shouldContinue = ((left = (typeof update === 'function' ? update(bindingObject[handler], domNode, bindingContext) : undefined)) != null ? left : true) && shouldContinue;

            // mark the handler as clean now that its been dealt with
            handlers[handler] = false;
        }

        // restore the previous state
        stateMemento();

        return shouldContinue;
    },

    // Recursively unbinds an entire dom tree from their associated model
    // @param [VirtualDomNode] domNode the node to start the unbind at
    unbindDomTree(domNode) {
        let left, left1;
        domNode = qdInternal.dom.virtualize(domNode);
        // remove the node from all observables it is registered for
        let observables = (left = qdInternal.storage.getInternalValue(domNode, 'observables')) != null ? left : [];
        for (let observable of observables) {
            qdInternal.observables.removeDependency.call(observable, domNode);
        }

        // trigger the cleanups for any applied handlers
        // go backwards through the dependency order to allow dependent handlers
        // to cleanup before their precursor deletes necessary state
        let boundHandlers = (left1 = qdInternal.storage.getInternalValue(domNode, 'handlers')) != null ? left1 : [];
        for (let i = qdInternal.state.binding.order.length - 1; i >= 0; i--) {
            let handler = qdInternal.state.binding.order[i];
            if (boundHandlers[handler] == null) { continue; }

            // cleanups only get the dom node
            let cleanup = qdInternal.handlers.getCleanup(handler);
            if (typeof cleanup === 'function') {
                cleanup(domNode);
            }
        }

        // delete all quickdraw references on dom
        domNode.clearValues();

        // unbind the children
        for (let child of domNode.getChildren()) {
            this.unbindDomTree(child);
        }

        // void the return
    }

};

// Applies bindings within the view model to the given domRoot
// @param [Object] viewModel a raw javascript object that contains
//                           bindable attributes
// @param [Node] domRoot     a root in the dom tree to bind to
// @throw Exception if view model or dom root is null
qd.bindModel = function(viewModel, domRoot) {
    if (viewModel == null) {
        return qdInternal.errors.throw(new QuickdrawError("Bind model called with null view model"));
    }

    // wrap viewmodel to quickdraw model, externally these are never seen
    viewModel = qdInternal.models.create(viewModel);
    let baseContext = qdInternal.context.create(viewModel);
    qdInternal.binding.bindModel(viewModel, domRoot, baseContext);

    // clear the template cache now that binding is complete
    qdInternal.templates.clearCache();

    // schedule changes to the dom to be rendered
    qdInternal.renderer.schedule();

    // dont return result
};


// Unbinds the given dom node by removing all model references from
// it and removing it as a dependency from any observables
// @note this will recursively unbind
// @param [DomNode] domRoot  a dom node that has been previously bound
qd.unbindModel = function(domRoot) {
    if (domRoot == null) { return; }

    // Unbind the tree
    qdInternal.binding.unbindDomTree(domRoot);

    // void the return and prevent loop captures
};

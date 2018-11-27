/**
 * Functions related to model/dom binding
 */

import { getInternalValue } from './storage';
import { state } from './state';
import { getConfig } from './config';
import { QuickdrawError, throwError } from './errors';
import { VirtualDomNode, unwrap as unwrapDomNode, virtualize } from './dom';
import { isModel, setParent } from './models';

/**
 * Parses the binding function associated with the given node
 * @param a node that could have a binding function
 * @return a function that can be called with an approrpriate context if the given node does have a binding function
 *     null if the given node does not have a binding function
 */
export function getBindingFunction(node: HTMLElement) {
    // If a node cant have an attribute, exit
    if (!node || !node.getAttribute) {
        return null;
    }

    // grab the binding string from the node
    let bindingString = node.getAttribute(getConfig('bindingAttribute'));

    // if there is no binding string, no bindings necessary
    if (bindingString == null) { return null; }

    // build a function if not already cached
    if (state.binding.functions[bindingString] == null) {
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
            return throwError(error);
        }
        state.binding.functions[bindingString] = bindingFunction;
    }

    // return the binding function
    return state.binding.functions[bindingString];
}

// Gets the binding function for the given dom node and evaluates it in the given binding context
// @param [VirtualDomNode] domNode the node to get the binding string of
// @param [Object] bindingContext the context to use in evaluating the node
// @return [Object] the result of the binding function if there is one, null otherwise
function getEvaluatedBindingObject(domNode: VirtualDomNode, bindingContext) {
    // get the binding function for this node
    let bindingFunction = this.getBindingFunction(domNode);

    // if there is no binding function return now
    if (bindingFunction == null) { return null; }

    try {
        // pass the real dom node to the binding function as the $element value
        return bindingFunction(bindingContext, unwrapDomNode(domNode));
    } catch (err) {
        let error = new QuickdrawError(`'${err.message}' in binding '${domNode.getAttribute(getConfig('bindingAttribute'))}'`, err);
        error.setBindingContext(bindingContext);
        throwError(error);
        return null;
    }
}

// Applies a recursive binding with the given binding context
// @note this should not be called from outside of quickdraw or a
//       registered binding handler
// @param [Object] viewModel a raw javascript object that contains
//                           bindable attributes
// @param [VirtualDomNode] domRoot     a root in the dom tree to bind to
// @param [Object] context   the context to use when binding
// @throw Exception if view model or dom root or context is null
export function bindModel(viewModel, domRoot: VirtualDomNode, context) {
    if (!viewModel) {
        return throwError(new QuickdrawError('Attempting binding of a null View Model'));
    }
    if (!domRoot) {
        return throwError(new QuickdrawError('Attempting to bind to a null Dom Root'));
    }
    if (!context) {
        return throwError(new QuickdrawError('Attempting binding with a null context'));
    }
    if (!isModel(viewModel)) {
        return throwError(new QuickdrawError('Internal binding called with non-qd view model, must use models.create'));
    }

    // virtualize the dom node if its not already
    domRoot = virtualize(domRoot);

    // store previous as this could be recursive
    setParent(viewModel, qdInternal.state.current.model);
    let stateMemento = qdInternal.updateCurrentState({
        model: viewModel
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
        throwError(error);
    }

    // revert to previous model
    stateMemento();
}

// Binds the given element root with the given binding context
// The children of the current element will be bound with the same
// binding context unless a binding handler terminates the binding
// @param [VirtualDomNode] a dom element with or without children to bind
// @param [Object] a binding context to apply
function bindDomTree(domRoot: VirtualDomNode, bindingContext) {
    // apply to the current node the binding context values
    if (this.bindDomNode(domRoot, bindingContext)) {
        // continue applying to children
        for (let child of domRoot.getChildren()) {
            this.bindDomTree(child, bindingContext);
        }
    }
}

// Applys any applicable binding handlers to the given node using the given context
// @param [VirtualDomNode] domRoot a dom element that may require binding
// @param [Object] bindingContext  the context to be given to the binding function
// @return  whether or not the child elements of this node should be parsed
function bindDomNode(domNode: VirtualDomNode, bindingContext) {
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
}

/** For the given node it runs the update function of any handlers that have been
 * marked as dirty on the dom node.
 * @param [DomNode] domNode the node that should be updated
 * @param [Object] bindingContext the context that the node should be evaluated in
 * @param [Object] bindingObject (optional) this parameter allows an already evaluated
 *                               binding object to be used instead of the result of the
 *                               binding function on the node.
 * @return [Boolean] whether or not the caller needs to traverse to the child nodes
 * @note the usual case will not provide a bindingObject but it is provided by the
 * original binding phase to prevent double evaluation of binding functions
 */
export function updateDomNode(domNode: HTMLElement, bindingContext, bindingObject = null) {
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
    let handlers = getInternalValue(domNode, 'handlers');
    for (let handler of state.binding.order) {
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
}

/**
 * Recursively unbinds an entire dom tree from their associated model
 * @param domNode the node to start the unbind at
 */
function unbindDomTree(domNode: VirtualDomNode | HTMLElement) {
    domNode = qdInternal.dom.virtualize(domNode);
    // remove the node from all observables it is registered for
    let observables = (left = getInternalValue(domNode, 'observables')) != null ? left : [];
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
}

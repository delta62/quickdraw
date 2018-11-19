import { Observable, unwrap as unwrapObservable } from './observables';
import { create as createModel, getParent, unwrap as unwrapModel } from './models';
import { getInternalValue, setInternalValue } from './storage';
import { getConfig } from './config';

interface ViewModel {
    __context: ViewModelContext;
}

interface ViewModelContext {
    $data: Observable<never>;
    $rawData: never;
    $parents: never[];
    $parent: never;
    $parentContext: ViewModelContext;
    $root: never;
    $extend(child: ViewModel): ViewModelContext;
}

/**
 * Creates a binding context that can be used for a binding function. If this viewmodel has a parental hirearchy the
 * binding context will reflect this relationship.
 *
 * The returned binding context has the following values:
 *   $data - the view model unwrapped if it is observable
 *   $rawData - the raw view model still wrapped if it is observable
 *   $parents - an array of parent view models
 *   $parent - the direct parent view model to the given one, null if none
 *   $parentContext - a binding context created for the parent view model
 *   $root - the root view model, i.e. the topmost context
 *   $extend - a function that can be called with a viewmodel meant to be the child of the given which will create a new
 *       properly extended context for that child
 *
 * @param viewModel the model to base the context off
 * @return a complete binding context for evaluation
 */
export function create(viewModel: ViewModel): ViewModelContext {
    // check if this viewmodel already has a context, reuse if so
    if (viewModel.__context) {
        return viewModel.__context;
    }

    // extending function for object
    let extend = function(this: ViewModelContext, child: ViewModel) {
        child = createModel(child);
        let rawChildModel = unwrapModel(child);
        // store context on child so it has a complete one to rebind with
        child.__context = {
            $data: unwrapObservable(rawChildModel),
            $rawData: rawChildModel,
            $parents: [this.$data].concat(this.$parents),
            $parent: this.$data,
            $parentContext: this,
            $root: this.$root,
            $extend: extend
        };
        return child.__context;
    };

    // construct original parents
    let parents = [ ];
    let parentModels = [ ];
    let current = viewModel;
    while (parent = getParent(current)) {
        parentModels.push(parent);
        parents.push(parent.raw);
        current = parent;
    }

    let root = viewModel.raw;
    if (parents.length && parents[parents.length - 1]) {
        root = parents[parents.length - 1]
    }

    let parentCtx = parentModels[0] ? parentModels[0].__context : null;

    // new object
    viewModel.__context = {
        $data: unwrapObservable(viewModel.raw),
        $rawData: viewModel.raw,
        $parents: parents,
        $parent: parents[0] || null,
        $parentContext: parentCtx,
        $root: root,
        $extend: extend
    };

    return viewModel.__context;
}

/**
 * Get the binding context used on a dom node if there was one
 * @param domNode the node to get the context for
 * @return the complete binding context if this node has been bound before null if the given node hasn't been bound
 * before
 */
export function get(domNode: HTMLElement) {
    let baseViewModel = getInternalValue(domNode, getConfig('baseModelKey'));
    if (baseViewModel == null) { return null; }
    return create(baseViewModel);
}

/**
 * Sets the binding context for a given dom node
 * @param domNode the node to set the context for
 * @param context the binding context that should be stored for this node
 */
export function set(domNode: HTMLElement, context: ViewModelContext) {
    setInternalValue(domNode, getConfig('baseModelKey'), context);
}

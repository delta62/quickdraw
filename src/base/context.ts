import { VirtualDomNode } from './dom';
import { Observable, unwrapObservable } from './observables';
import { Model, create as createModel, getParent, unwrap as unwrapModel } from './models';
import { getInternalValue, setInternalValue } from './storage';
import { getConfig } from './config';

interface ViewModel<T> extends Model<T> {
    __context: ViewModelContext<T>;
}

interface ViewModelContext<T> {
    $data: Observable<any>;
    $rawData: T;
    $parents: any[];
    $parent: never | null;
    $parentContext: ViewModelContext<T> | null;
    $root: any;
    $extend(child: ViewModel<T>): ViewModelContext<T>;
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
export function create<T>(viewModel: ViewModel<T>): ViewModelContext<T> {
    // check if this viewmodel already has a context, reuse if so
    if (viewModel.__context) {
        return viewModel.__context;
    }

    // construct original parents
    let parents: any[] = [ ];
    let parentModels: ViewModel<never>[] = [ ];
    let current = viewModel;
    let parent;
    while (parent = getParent(current)) {
        parentModels.push(parent as ViewModel<never>);
        parents.push(parent.raw);
        current = parent as ViewModel<T>;
    }

    let root = parents.length
        ? unwrapObservable(parents[parents.length - 1])
        : viewModel.raw;

    // new object
    viewModel.__context = {
        $data: unwrapObservable(viewModel.raw),
        $rawData: viewModel.raw,
        $parents: parents,
        $parent: parents[0] || null,
        $parentContext: parentModels.length && parentModels[0] ? (parentModels[0] as ViewModel<never>).__context : null,
        $root: root,
        $extend: extend
    };

    return viewModel.__context;
}

/**
 * extending function for object
 */
function extend<T>(this: ViewModelContext<T>, child: Model<T> | T) {
    child = createModel(child);
    let rawChildModel = unwrapModel(child);
    // store context on child so it has a complete one to rebind with
    (child as any).__context = {
        $data: unwrapObservable(rawChildModel),
        $rawData: rawChildModel,
        $parents: [this.$data].concat(this.$parents),
        $parent: this.$data,
        $parentContext: this,
        $root: this.$root,
        $extend: extend
    };
    return (child as any).__context;
}

/**
 * Get the binding context used on a dom node if there was one
 * @param domNode the node to get the context for
 * @return the complete binding context if this node has been bound before null if the given node hasn't been bound
 * before
 */
export function get<T>(domNode: VirtualDomNode | HTMLElement) {
    let baseViewModel = getInternalValue<ViewModel<T>>(domNode, getConfig('baseModelKey'));
    if (!baseViewModel) return null;
    return create(baseViewModel);
}

/**
 * Sets the binding context for a given dom node
 * @param domNode the node to set the context for
 * @param context the binding context that should be stored for this node
 */
export function set<T>(domNode: HTMLElement, context: ViewModelContext<T>) {
    setInternalValue(domNode, getConfig('baseModelKey'), context);
}

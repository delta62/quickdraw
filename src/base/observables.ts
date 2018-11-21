import { VirtualDomNode, unwrap as unwrapDom } from './dom';
import { state } from './state';
import { set as setContext } from './context';

export interface Observable {
    __dependencies: never[] | null;
}

/**
 * Define internal observable functions
 * Adds a dom element and view model as a dependency to this observable
 * @param [Object] model the model that is used for the context of the element
 * @param [DomElement] element the element that is being updated
 * @param [String] handler the name of the handler accessing this observable
 */
function addDependency(this: Observable, model = state.current.model, element: VirtualDomNode | HTMLElement | null = state.current.element, handler = state.current.handler) {
    if (!model || !element) return;

    // unwrap the element in case its virtual
    element = unwrapDom(element);

    // store model on dom element, may overrite previous models, this is fine
    // elements should only be bound to one model anyways
    setContext(element, model);

    if (!this.__dependencies) {
        this.__dependencies = [ ];
    }

    // Add element to observable dependencies
    let matchingElms = this.__dependencies.filter(elm => elm.domNode === element);
    if (matchingElms.length > 0) {
        dependencyObject = matchingElms[0];
    } else {
        dependencyObject = {
            domNode : element,
            handlers : []
        };
        this.__dependencies.push(dependencyObject);
        // bound to a new element, alert listeners
        this.emit('bound', [model, element]);
    }

    // If a handler is defined, specify it in the handlers
    if (handler != null) {
        // if the current handler is not in the list of handlers, add it
        if (!__in__(handler, dependencyObject.handlers)) {
            dependencyObject.handlers.push(handler);
        }
    } else {
        // observable unwrapped in raw binding object, we cant tie it to a specific handler
        dependencyObject.unspecific = true;
    }

    // Add observable to the dom element that is being updated
    let observables = (left = qdInternal.storage.getInternalValue(element, 'observables')) != null ? left : [];
    if (!__in__(this, observables)) {
        observables.push(this);
    }
    qdInternal.storage.setInternalValue(element, 'observables', observables);

    // dont return result
}

// Adds a computed as a dependent to this observable
// @param [QDComputed] computed the computed that depends on the observable
function addComputedDependency(computed) {
    if (this.__computedDependencies == null) { this.__computedDependencies = []; }

    // Add to observable if necessary
    if (!__in__(computed, this.__computedDependencies)) {
        this.__computedDependencies.push(computed);
    }

}

// Gets the dependencies for an observable
// @note this will contain any nodes that are dependent directly or via computeds
// @return [Array] the dom elements that are dependent on this observable
function getDependencies() {
    // get base direct dependencies
    let dependencies = this.__dependencies != null ? this.__dependencies : [];

    // get the dependencies as a result of computeds
    for (let computed of (this.__computedDependencies != null ? this.__computedDependencies : [])) {
        dependencies = dependencies.concat(qdInternal.observables.getDependencies.call(computed));
    }

    return dependencies;
}

// Removes the given dom element as a dependency from this observable
// @param [DomNode] element the dom node to remove
function removeDependency(element) {
    // ensure virtual elements are unwrapped
    element = qdInternal.dom.unwrap(element);

    this.__dependencies = (this.__dependencies.filter((dependency) => dependency.domNode !== element));
    this.emit('unbound', [element]);
}

// Returns whether or not this observable has any type of dependency
// @return [Boolean] whether or not the observable has any dependencies
function hasDependencies() {
    return qdInternal.observables.getDependencies.call(this).length > 0;
}

// Causes an update to happen for the dependencies of this observable
function updateDependencies(immediate = false) {
    let dependencies = qdInternal.observables.getDependencies.call(this);
    // only update if there are dependencies
    if (!(dependencies.length > 0)) { return; }

    let immediateRebinds = [];

    // traverse through the registered dependencies
    for (let dependency of dependencies) {
        var handler;
        let element = dependency.domNode;

        // mark all the dependent handlers dirty on the node
        let handlers = qdInternal.storage.getInternalValue(element, 'handlers');

        // todo, fix bug where handlers doesnt exist but handler is specific
        if (!handlers) { continue; }

        if (dependency.unspecific) {
            // observable must refresh all handlers because it was not specific enough
            for (handler in handlers) {
                handlers[handler] = true;
            }
        } else {
            // observable can be specific
            for (handler of dependency.handlers) {
                handlers[handler] = true;
            }
        }

        if (immediate) {
            immediateRebinds.push(element);
        } else {
            // enqueue this element for updates
            qdInternal.updates.enqueue(element);
        }
    }

    if (immediate) {
        // If immediate update requested process all nodes now
        qdInternal.updates.updateNodeSet(immediateRebinds);

        // trigger a bind render now, note we have to render the entire queue because of strict ordering
        qdInternal.renderer.render();
    } else {
        // schedule an update to occur
        qdInternal.updates.schedule();
    }

    // emit a set value event since a change has occurred
    this.emit('set');

}

// These functions will be aliased to the observables we create
// but they use the 'this' value to reference any necessary state
// so that they can be defined once and used many times
let helpers = {
    // General Observable Helpers

    // Immediately updates the current observables dependencies
    immediate(newValue) { return this(newValue, true); },

    // Silently updates the current observables dependencies
    silent(newValue) { return this(newValue, false, false); },

    // so that observables can be properly unpacked but still have simple negation
    // we will expose a 'secondary' observable under the 'not' attribute
    not(newValue, immediate, alertDependencies) { return !this(newValue, immediate, alertDependencies); },

    // Array Observable Helpers
    indexOf(find) {
        for (let i = 0; i < this.value.length; i++) {
            let item = this.value[i];
            if (item === find) {
                return i;
            }
        }
        return -1;
    },

    slice() {
        let ret = this.value.slice.apply(this.value, arguments);
        qdInternal.observables.updateDependencies.call(this);
        return ret;
    },

    push(item) {
        this.value.push(item);
        qdInternal.observables.updateDependencies.call(this);
    },

    pop() {
        let ret = this.value.pop();
        qdInternal.observables.updateDependencies.call(this);
        return ret;
    },

    unshift(item) {
        this.value.unshift(item);
        qdInternal.observables.updateDependencies.call(this);
    },

    shift() {
        let ret = this.value.shift();
        qdInternal.observables.updateDependencies.call(this);
        return ret;
    },

    reverse() {
        this.value.reverse();
        qdInternal.observables.updateDependencies.call(this);
    },

    sort(func) {
        this.value.sort(func);
        qdInternal.observables.updateDependencies.call(this);
    },

    splice(first, count, ...elements) {
        let ret = this.value.splice(first, count, ...Array.from(elements));
        qdInternal.observables.updateDependencies.call(this);
        return ret;
    },

    remove(find) {
        let newBack = [];
        let removed = [];
        for (let item of this.value) {
            // if find is a callback call it, otherwise compare
            var left;
            let drop = ((left = (typeof find === 'function' ? find(item) : undefined)) != null ? left : (item === find));

            // add to appropriate array
            (drop ? removed : newBack).push(item);
        }

        this.value = newBack;
        qdInternal.observables.updateDependencies.call(this);
        return removed;
    },

    removeAll(items) {
        let removed = [];
        if (items != null) {
            let newBack = [];
            for (let item of this.value) {
                if (__in__(item, items)) {
                    removed.push(item);
                } else {
                    newBack.push(item);
                }
            }
            this.value = newBack;
        } else {
            removed = this.value;
            this.value = [];
        }
        qdInternal.observables.updateDependencies.call(this);
        return removed;
    }
},

function extendFunctions(obs) {
    // Mark this as observable
    obs.isObservable = true;

    // expose some helpers externally
    obs.isBound = this.hasDependencies;
    obs.immediate = this.helpers.immediate;
    obs.silent = this.helpers.silent;

    // since not can be passed alone in a binding string we
    // need to pass a closure, this will be removed once not
    // is no longer an attached property
    obs.not = function() { return this.helpers.not.apply(obs, arguments); }.bind(this);

    obs.not.isObservable = true;

    // make observables support eventing
    qdInternal.eventing.add(obs);

    // return our newly completed observable
    return obs;
}

// Constructs a new observable object that can be added to a raw data model
// @param [mixed] initialValue the value to start the observable at
// @return [QDObservable] a new observable ready to be bound
qd.observable = function(initialValue) {
    // The function base for the new observable
    var obv = function(newValue, immediate = false, alertDependencies = true) {
        // If we are applying bindings and no model has been
        // set for this observable, set it
        if (qdInternal.state.current.model != null) {
            addDependency.call(obv);
        }

        // Check if we were given a new value, if so set it
        // and update any dependencies
        if (typeof newValue !== "undefined") {
            obv.value = newValue;
            // only alert updates if enabled
            if (alertDependencies) {
                qdInternal.observables.updateDependencies.call(obv, immediate);
            }
        } else {
            if (alertDependencies) {
                // emit an access event synchronously so listeners can
                // modify the value if they want
                obv.emit('access', [], false);
                // emit an accessed event so listeners can know it was used
                obv.emit('accessed');
            }
        }

        // Return the current value
        return obv.value;
    };

    // state values for the observable
    obv.value = initialValue;
    return qdInternal.observables.extendFunctions(obv);
};

// Constructs a new computed object that will trigger updates on
// any of its dependencies whenever one of the observables it uses updates
// @param [Function] computedValue the function that computes a value
// @param [Object] thisBinding the value to bind as 'this' for calls to computedValue
// @param [Array] observables an array of observables that the computed depends on
qd.computed = function(computedValue, thisBinding, observables) {
    if (thisBinding == null) {
        qdInternal.errors.throw(new QuickdrawError("Creating computed without specifying the appropriate this context to evaluate in"));
    }

    if ((observables == null) || (observables.length === 0)) {
        qdInternal.errors.throw(new QuickdrawError("Creating computed without specifying the appropriate observables the computed uses"));
    }

    // The function that we will hand back for users to call
    var compute = function(...params) {
        // If we are applying bindings and no model has been
        // set for this observable, set it
        if (qdInternal.state.current.model != null) {
            qdInternal.observables.addDependency.call(compute);
        }

        // Call the real function with the given arguments
        return computedValue.apply(thisBinding, params);
    };

    // Register this as a dependency to the given observables
    for (let observe of observables) {
        // If observe is undefined we do not add the computed dependency as there is nothing to add it to.
        // If added without a valid observable, this would cause a memory leak as the computedDependency
        // is attached to the window instead of the observable, thus making it a very difficult reference
        // to remove.
        if (observe == null) {
            qdInternal.errors.throw(new QuickdrawError("Creating computed with undefined or null observables is not allowed"));
            continue;
        }

        qdInternal.observables.addComputedDependency.call(observe, compute);
    }

    return qdInternal.observables.extendFunctions(compute);
};

// Constructs a new observable array object that functions just like
// a javascript array (except the bracket operators) but has the benefit
// of being able to update the UI on changes
// @param [Array] initialValue the value to start the observable with, defaults to empty array
// @return [QDObservableArray] a new observable ready to be bound
qd.observableArray = function(initialValue = []) {
    // at the heart observable arrays are just observables
    let arr = qd.observable(initialValue);

    // but we add some nice helper functions to manipulate arrays
    // without the need to unpack them and also extend their functionality
    let { helpers } = qdInternal.observables;
    arr.indexOf = helpers.indexOf;
    arr.slice = helpers.slice;
    arr.push = helpers.push;
    arr.pop = helpers.pop;
    arr.unshift = helpers.unshift;
    arr.shift = helpers.shift;
    arr.reverse = helpers.reverse;
    arr.sort = helpers.sort;
    arr.splice = helpers.splice;
    arr.remove = helpers.remove;
    arr.removeAll = helpers.removeAll;

    return arr;
};

// Checks whether or not a given value is an observable
// @param [Mixed] value a possible observable
// @return [Boolean] true if value is an observable, false otherwise
export function isObservable(value: any): value is Observable {
    !!(value && value.isObservable)
}

// @param [mixed] possible a value that could be an observable
// @param [Boolean] recursive if the unwrapped value is an object any properties
//                            of the object will be recursively unwrapped
// @note a recursive unwrapping will yield a new object so the results of multiple
//       calls cannot be used with direct comparisons
// @return If the value given is an observable returns the wrapped value
//         If the value given is not an observable, just that value
export function unwrapObservable(possible, recursive = false) {
    // handle null case upfront
    if (possible == null) { return possible; }

    let unwrapped = possible;
    if (qd.isObservable(possible)) {
        let left;
        unwrapped = (left = (typeof possible.silent === 'function' ? possible.silent() : undefined)) != null ? left : possible();
    }

    // again handle a null value within an observable/computed
    // note: typeof null == 'object'
    if (unwrapped == null) { return unwrapped; }

    // if this value can be recursively unwrapped and that was
    // requested, do it now
    if (recursive && (typeof unwrapped === 'object')) {

        let recursed, value;
        if (Object.prototype.toString.call(unwrapped) === '[object Array]') {
            recursed = new Array(unwrapped.length);
            for (let index = 0; index < unwrapped.length; index++) {
                // unwrap the value and recurse if it is also an object
                value = unwrapped[index];
                recursed[index] = qd.unwrapObservable(value, true);
            }
        } else {
            recursed = {};
            for (let key in unwrapped) {
                // unwrap the value and recurse if it is also an object
                value = unwrapped[key];
                recursed[key] = qd.unwrapObservable(value, true);
            }
        }

        unwrapped = recursed;
    }

    return unwrapped;
};

/**!
 * Quickdraw
 * A Hulu Original Library
 *
 * An MVVM data binding framework designed for speed and efficiency on living room devices.
 * This library is optimized for light and quick loads so seamless experiences can be
 * created on both low and high powered devices
 */

import { EventEmitter, add as addEvents } from './base/eventing';
import { CurrentState, state } from './base/state';
import { get as getModel, unwrap as unwrapModel } from './base/models';
import { QuickdrawError, throwError } from './base/errors';
import { register } from './base/templates';

interface Quickdraw {
    _: QuickdrawInternal;
    getModel(domNode: HTMLElement): any;
}

interface QuickdrawInternal {
    config: QuickdrawConfig;
    updateCurrentState(): () => void;
}

interface QuickdrawConfig {
    /** The attribute on the dom elements to get binding strings from */
    bindingAttribute: string;
    /** The maxiumum number of updates that can queue before they are automatically applied */
    maxQueuedUpdates: number;
    /** Whether or not updates can currently be processed */
    updatesEnabled: boolean;
    /** Whether or not updates should be handled async */
    updatesAsync: boolean;
    /**  Whether or not nodes should be rendered when they are ready */
    renderEnabled: boolean;
    /** Whether or not renders should be handled async */
    renderAsync: boolean;
    /** the default amount of time to wait before applying queued updates */
    defaultUpdateTimeout: number;
    /** the data storage key for a dependencies view model */
    baseModelKey: string;
    /** the key to use for data storage on nodes */
    nodeDataKey: string;
    /** default caching size for cache pools, -1 for infinite */
    defaultCacheSize: number;
}

// All methods that are for internal use only (which does include use by binding handlers)
// will be under the qdInternal namespace. Note that this namespace should never be
// used outside of quickdraw or a binding handler but is exposed as qd._ for testability
let qd: Quickdraw = {
    _: {
        config: {
            bindingAttribute: 'data-bind',
            maxQueuedUpdates: 25,
            updatesEnabled: true,
            updatesAsync: true,
            renderEnabled: true,
            renderAsync: true,
            defaultUpdateTimeout: 50,
            baseModelKey: 'base-view-model',
            nodeDataKey: '_qdData',
            defaultCacheSize: -1
        },
        updateCurrentState(updates: Record<string, never> = {}) {
            let value;
            let oldValues: Record<string, string | null> = { };

            // update the current state object with new values
            for (let key in updates) {
                value = updates[key];
                oldValues[key] = state.current[key as keyof CurrentState];
                state.current[key as keyof CurrentState] = value;
            }

            // return a memento that can restore the previous state
            return function() {
                let result = [];
                for (let key in oldValues) {
                    value = oldValues[key];
                    result.push(state.current[key as keyof CurrentState] = value);
                }
            };
        }
    },

    /**
     * For a given dom node this method returns the model bound to the dom node
     * @param [DomNode] domNode the node that has been previously bound
     * @return [Object] a raw javascript object that was bound to the node
     *                  null if the given node was not bound
     */
    getModel: function(domNode: HTMLElement) {
        unwrapModel(getModel(domNode))
    },
    registerTemplate:function(name: string, templateNodes) {
        if (!(templateNodes instanceof Array)) {
            return throwError(new QuickdrawError("Nodes for template must be given as an array"));
        }

        return register(templateNodes, name);
    }
}

// // Applies bindings within the view model to the given domRoot
// // @param [Object] viewModel a raw javascript object that contains
// //                           bindable attributes
// // @param [Node] domRoot     a root in the dom tree to bind to
// // @throw Exception if view model or dom root is null
// qd.bindModel = function(viewModel, domRoot) {
//     if (viewModel == null) {
//         return qdInternal.errors.throw(new QuickdrawError("Bind model called with null view model"));
//     }
//
//     // wrap viewmodel to quickdraw model, externally these are never seen
//     viewModel = qdInternal.models.create(viewModel);
//     let baseContext = qdInternal.context.create(viewModel);
//     bindModel(viewModel, domRoot, baseContext);
//
//     // clear the template cache now that binding is complete
//     qdInternal.templates.clearCache();
//
//     // schedule changes to the dom to be rendered
//     schedule();
// };
//
//
// // Unbinds the given dom node by removing all model references from
// // it and removing it as a dependency from any observables
// // @note this will recursively unbind
// // @param [DomNode] domRoot  a dom node that has been previously bound
// qd.unbindModel = function(domRoot) {
//     if (domRoot == null) { return; }
//
//     // Unbind the tree
//     unbindDomTree(domRoot);
// };

addEvents(qd);

export default qd as Quickdraw & EventEmitter;

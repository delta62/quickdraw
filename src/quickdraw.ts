/**!
 * Quickdraw
 * A Hulu Original Library
 *
 * An MVVM data binding framework designed for speed and efficiency on living room devices.
 * This library is optimized for light and quick loads so seamless experiences can be
 * created on both low and high powered devices
 */

import { QuickdrawState } from './base/state';
import { add as addEvents } from './base/eventing';

interface Quickdraw {
    _: QuickdrawInternal;
}

interface QuickdrawInternal {
    config: QuickdrawConfig;
    state: QuickdrawState;
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
            let oldValues: Record<string, never> = { };

            // update the current state object with new values
            for (let key in updates) {
                value = updates[key];
                oldValues[key] = qd._.state.current[key];
                qd._.state.current[key] = value;
            }

            // return a memento that can restore the previous state
            return function() {
                let result = [];
                for (key in oldValues) {
                    value = oldValues[key];
                    result.push(qdInternal.state.current[key] = value);
                }
            };
        }
    },
    // For a given dom node this method returns the model bound to the dom node
    // @param [DomNode] domNode the node that has been previously bound
    // @return [Object] a raw javascript object that was bound to the node
    //                  null if the given node was not bound
    getModel: function(domNode) {
        unwrapModel(getModel(domNode))
    }
}

addEvents(qd);

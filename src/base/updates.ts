/**
 * Functions related to updates that need to be dealt with
 */

import { updateDomNode } from './binding';
import { get as getContext } from './context';
import { virtualize } from './dom';
import { getConfig } from './config';
import { cancel } from './async';
import { state } from './state';
import qd from '../quickdraw';

/**
 * Fires the updates that have been queued in quickdraw
 */
function run() {
    // clear timeout but dont reset update key yet
    state.updates.key && cancel(state.updates.key);

    // only perform updates if updates are enabled
    if (getConfig('updatesEnabled')) {
        // rebind all of the nodes that have been queued
        updateNodeSet(state.updates.queue);
        // 'clear' the array
        state.updates.queue.length = 0;
    }

    // clear the timeouts after binding, this prevents any changes that happen
    // during binding from scheduling a new update to be run
    state.updates.key = null;
    state.updates.immediate = false;
}

/**
 * Updates the given set of node such that they no longer have dirty states
 * @param nodes a set of DomNodes that need to be updated
 */
function updateNodeSet(nodes: HTMLElement[]) {
    // alert any listeners that binding updates will occur
    qd.emit("updatesWillOccur", null, false);

    let i = 0;
    // use a while loop so that we rebind any additional nodes added to
    // an array via reference while our run loop is going
    while (i < nodes.length) {
        // grab the node and increment i
        let dependency = virtualize(nodes[i++]);

        // get the binding context this node should be evaluated in
        // it is created from the stored data
        let bindingContext = getContext(dependency);

        // if there is no binding context, skip
        if (!bindingContext) continue;

        // update the bindings on the dom node
        updateDomNode(dependency, bindingContext);
    }

    // clear the template cache since updates are done
    templates.clearCache();

    // schedule the changes to the dom to be rendered
    schedule();

    // now that updates have finished let any listeners know
    qd.emit("updatesHaveOccurred", null, false);
}

/**
 * Schedules any queued updates to be fired, if an update has already
 * been schedule no new updates are schedule and the current one is left in place
 * @param [Boolean] immediately if true updates will be set to run regardless of current queue size
 *                              if false updates will be set to run when the queue max has
 *                              been reached or the default update timeout occurs, whichever is first
 */
function schedule(immediately = false) {
    if (getConfig('updatesAsync')) {
        // all updates should be done async when done via schedule
        let updatesState = state.updates;
        if ((updatesState.queue.length >= getConfig('maxQueuedUpdates')) || immediately) {
            // only set the immediate update once
            if (!updatesState.immediate) {
                async.cancel(updatesState.key);
                updatesState.key = immediate(run);
                updatesState.immediate = true;
            }
        } else if (updatesState.key == null) {
            updatesState.key = delayed(run, getConfig('defaultUpdateTimeout'));
        }
    } else {
        // all updates are done synchronously, we call run directly
        run();
    }
}

export function enqueue(domNode) {
    if (domNode, state.updates.queue.indexOf(domNode) === -1) {
        state.updates.queue.push(domNode);
    }
}

/**
 * Calling this method will prevent any dom updates from occuring until
 * enableUpdates is called. Use this if you want quickdraw to stop working
 * during a critical path in your system
 */
qd.disableUpdates = function() {
    qd.setConfig('updatesEnabled', false);
    // cancel any impending updates to prevent cycle waste
    qdInternal.async.cancel(qdInternal.state.updates.key);
    qdInternal.state.updates.key = null;
};

/**
 * This will enable quickdraw to perform updates again, if there have
 * been any updates that have occured since updates were disabled
 * they will be set to execute
 * @param [Boolean] runEnqueuedSynchronously whether or not to run the current queue of updates
 *                                           before returning or async after returning
 */
qd.enableUpdates = function(runEnqueuedSynchronously = false) {
    qd.setConfig('updatesEnabled', true);
    if (qdInternal.state.updates.queue.length > 0) {
        // always schedule update so that key/immediate are set correctly
        qdInternal.updates.schedule(true);
        if (runEnqueuedSynchronously) {
            run();
        }
    }
};

import qd from '../quickdraw';
import { getConfig } from './config';
import { state } from './state';
import { cancel, immediate } from './async';
import { VirtualDomNode } from './dom';
import { QuickdrawError, throwError } from './errors';

/** Render queue */
let queue: VirtualDomNode[];

export function enqueue(virtualNode: VirtualDomNode) {
    if ((virtualNode == null) || !(virtualNode instanceof VirtualDomNode)) {
        return throwError(new QuickdrawError("Cannot queue a non-virtual node for render"));
    }

    let renderState = state.render;
    if (!renderState.enqueuedNodes[virtualNode.getUniqueId()]) {
        renderState.enqueuedNodes[virtualNode.getUniqueId()] = true;
        state.render.queue.push(virtualNode);
    }

}

export function schedule() {
    if (getConfig('renderAsync')) {
        // renders should be performed async
        if (state.render.key == null) {
            if (window.requestAnimationFrame != null) {
                state.render.key = -1;
                window.requestAnimationFrame(render);
            } else {
                state.render.key = immediate(render);
            }

            // alert that a render is scheduled to happen
            return qd.emit('renderScheduled', [{
                usingAnimationFrame: (window.requestAnimationFrame != null)
            }], false);
        }
    } else {
        // renders should happen synchronously
        return render();
    }
}

export function render() {
    // clear any current render timeout
    cancel(state.render.key);

    // render only if rendering is enabled
    if (getConfig('renderEnabled')) {

        // alert any listeners that a render will occur
        let patch;
        qd.emit('renderWillOccur', null, false);

        let patchesToRender = [];

        // generate a set of patches to render
        for (var node of queue) {
            patch = node.generatePatch();
            if (patch != null) {
                patchesToRender.push(patch);
            }
        }

        // render all the patches, no calculation is done here just application
        // this is done in a separate loop to try and make it as fast as possible
        for (patch of patchesToRender) {
            renderPatch(patch);
        }

        // notify render on all nodes
        for (node of queue) {
            node.emit('render', null, false);
        }

        queue = [ ];
        enqueuedNodes = { };

        // now that the render is complete let listeners know
        qd.emit('renderHasOccurred', null, false);
    }

    // clear timeout key
    qdInternal.state.render.key = null;

    // dont expose anything
}

export function renderPatch(patch) {
    // get a quick node reference
    let key, value;
    let { node } = patch;

    // apply all non-children pieces of the patch first
    if (patch.properties != null) {
        for (key in patch.properties) {
            value = patch.properties[key];
            node[key] = value;
        }
    }

    if (patch.attributes != null) {
        for (key in patch.attributes) {
            value = patch.attributes[key];
            if (value === null) {
                node.removeAttribute(key);
            } else {
                node.setAttribute(key, value);
            }
        }
    }

    if (patch.styles != null) {
        for (key in patch.styles) {
            value = patch.styles[key];
            node.style[key] = value;
        }
    }

    // quick break if there are no child changes
    if (patch.children == null) { return; }

    // apply the children updates now
    for (let action of patch.children) {
        var garbage;
        if (action.type === "remove") {
            let parent = action.value.parentNode;
            // if the node has already moved, don't remove it.
            if (node === parent) {
                // capture removed for some platforms to prevent leaks
                garbage = parent.removeChild(action.value);
            }
        } else { // action type is insert
            let beforeReference = null;
            if ((action.follows != null) || (action.leads != null)) {
                // if follows or leads has a value in the action we use that
                // note that following something means we must use the next
                // sibling as the insertion point for 'insertBefore'
                beforeReference = action.leads != null ? action.leads : action.follows.nextSibling;
            } else if (action.hasOwnProperty('follows')) {
                // otherwise if action has a defined follow key but no value
                // it is the head of the list and should be inserted at the front
                beforeReference = node.firstChild;
            }

            // else would be action with a leads key and no value which means
            // it is the tail node and should be appended to the end

            garbage = node.insertBefore(action.value, beforeReference);
        }
    }
}

// Calling this method will prevent any dom updates from occuring until
// enabledRending is called. Use this if you want quickdraw to stop rendering
// changes to dom but still process observable updates
qd.disableRendering = function() {
    qd.setConfig('renderEnabled', false);
};

// This will enable quickdraw to preform dom updates again, if there have
// been any updates to variables since this was disabled they will all be
// rendered if they are still relevant.
qd.enableRendering = function() {
    qd.setConfig('renderEnabled', true);

    // render the changes to the dom now
    qdInternal.renderer.render();
};

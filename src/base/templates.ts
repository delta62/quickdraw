/** Functions related to the templating subsystem */

import { clearValues } from './storage';
import { state } from './state';
import { VirtualDomNode, unwrap as unwrapDom, virtualize } from './dom';
import { create as createCache } from './cache';
import { QuickdrawError, throwError } from './errors';

let _uniqueId = 0;

function _generator(name: string, doc: Document) {
    let nodes = state.templates.nodes[name];
    let newNodes = new Array(nodes.length);
    for (let index = 0; index < nodes.length; index++) {
        let node = nodes[index];
        if (doc != null) {
            // if a document reference is given, import the node with that reference
            newNodes[index] = doc.importNode(node, true);
        } else {
            // otherwise simply clone the node
            newNodes[index] = node.cloneNode(true);
        }
    }
    return newNodes;
}

export function resolve(name: string) {
    return state.templates.aliases[name] != null ? state.templates.aliases[name] : name;
}

export function exists(name: string) {
    let realName = state.templates.aliases[name] != null ? state.templates.aliases[name] : name;
    return !!state.templates.nodes[realName];
}

export function get(name: string, doc: Document) {
    let templateState = state.templates;
    let realName = templateState.aliases[name] != null ? templateState.aliases[name] : name;

    if (templateState.nodes[realName] == null) {
        return throwError(new QuickdrawError("No template defined for given name"));
    }

    if (templateState.cache == null) {
        // if the cache has not been defined yet, do so now
        templateState.cache = createCache(_generator);
    }

    let nodes = templateState.cache.get(realName, doc);

    for (let i = 0, end = nodes.length, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
        let node = nodes[i];
        if ((doc != null) && (node.ownerDocument !== doc)) {
            // we need to adopt the node before it can be used
            node = doc.adoptNode(node);
        }

        // virtualize the dom node that we return
        nodes[i] = virtualize(node);
        nodes[i].setTemplateName(realName);
    }

    // return the nodes
    return nodes;
}

export function ret(name: string, nodes: (VirtualDomNode | HTMLElement)[]) {
    let templateState = state.templates;
    let realName = templateState.aliases[name] != null ? templateState.aliases[name] : name;

    if (templateState.nodes[realName] == null) {
        return throwError(new QuickdrawError("Given name is not a valid template name"));
    }
    if (!templateState.cache) {
        return throwError(new QuickdrawError("Cache has not been initialized"));
    }

    // ensure the nodes are unwrapped if they are virtual
    let storageNodes = new Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i];
        storageNodes[i] = unwrapDom(node);
    }

    templateState.cache.put(realName, storageNodes);
}

export function register(nodes: (HTMLElement | VirtualDomNode)[], name: string) {
    let templateName = null;
    let templateState = state.templates;

    if (templateState.aliases[name]) {
        return throwError(new QuickdrawError(`Template already defined for given name "${name}"`));
    }

    // Virtual nodes may already be from a template. If that's the case, they do not need to be parsed into HTML again.
    if (nodes[0] instanceof VirtualDomNode) {
        templateName = (nodes[0] as VirtualDomNode).getTemplateName();
    }

    if (!templateName) {
        // generate an HTML string for the nodes given and construct a fragment
        let html = "";
        let cleanNodes = new Array(nodes.length);
        for (let i = 0; i < nodes.length; i++) {
            // we only want to store non-virtual elements to generate from
            let node = nodes[i];
            node = unwrapDom(node)!;

            // store the node in the cleaned up set
            cleanNodes[i] = node;

            // completely wipe all data from the node, we dont care about anything including virtual changes
            clearValues(node);

            // append the outer html of the node
            html += node.outerHTML;
        }

        if (templateState.html[html] == null) {
            templateName = _uniqueId++;
            templateState.html[html] = templateName;
            templateState.nodes[templateName] = cleanNodes;
        } else {
            templateName = templateState.html[html];
        }
    }

    // add the given name as an alias to this info set
    if (name != null) {
        templateState.aliases[name] = templateName;
    }

    // return the given name or a generated name if no name given
    return name != null ? name : templateName;
}

export function unregister(name: string) {
    delete state.templates.aliases[name];
}

export function clearCache() {
    state.templates.cache && state.templates.cache.clear();
}

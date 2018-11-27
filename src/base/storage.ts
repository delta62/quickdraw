import { state } from './state';
import { getConfig } from './config';
import { VirtualDomNode, unwrap } from './dom';

/**
 * Stores a quickdraw associated value on the node as an internal storage value
 * @param node a node to store the value on
 * @param name the name of the value to store
 * @param value the value to store on the node
 *
 * @note this method should not be used outside of the core of quickdraw
 * @note virtual nodes will be correctly unwrapped
 */
export function setInternalValue(node: VirtualDomNode | HTMLElement, name: string, value: any) {
    setValue(unwrap(node)!, name, value, '_');
}

/**
 * Returns a value from a node that is stored as an internal value
 * @param node a node to get the value from
 * @param name the name of the value to get
 *
 * @note this method should not be used outside of the core of quickdraw
 * @note virtual nodes will be correctly unwrapped
 */
export function getInternalValue<T>(node: VirtualDomNode | HTMLElement, name: string): T | null {
    return getValue(unwrap(node)!, name, '_');
}

/**
 * Stores a value related to the node for a handler
 * @param node the node related to the value to store
 * @param name the name of the value to store
 * @param value the value to store
 * @param namespace the name of the storage area to group be automagically set to your handlers name by default
 *
 * @note it is extremely rare that you would want to specify a non default value for the 4th parameter, but if you want
 * to share storage between handlers that would be one easy way to do it
 */
export function setValue(node: VirtualDomNode | HTMLElement, name: string, value: any, namespace?: string): void
export function setValue(node: any, name: string, value: any, namespace?: string) {
    namespace = namespace || state.current.handler || "null";
    let storageKey: string = getConfig('nodeDataKey');

    if (node[storageKey] == null) {
        node[storageKey] = { };
    }

    if (node[storageKey][namespace] == null) {
        node[storageKey][namespace] = { };
    }

    node[storageKey][namespace][name] = value;
}

/**
 * Retrieves a value related to the given node for a handler
 * @param node the node related to the value to retrieve
 * @param name the name of the value to retrieve
 * @return the originally stored object, null if there is none
 * @param namespace the name of the storage area to group by automagically set to your handlers name by default
 *
 * @note it is extremely rare that you would want to specify a non default value for the 4th parameter, but if you want
 * to share storage between handlers that would be one easy way to do it
 */
export function getValue<T>(node: VirtualDomNode | Node, name: string, namespace?: string): T | null
export function getValue(node: any, name: string, namespace?: string) {
    namespace = namespace || state.current.handler || "null";
    let storageKey = getConfig('nodeDataKey');

    if (node[storageKey] && node[storageKey][namespace] && node[storageKey][namespace][name] != null) {
        return node[storageKey][namespace][name];
    }

    return null;
}

/**
 * Removes all handler stored values on the given node
 * @param node the node that we want to clear all the values off of
 * @note virtual dom objects will be correctly unwrapped
 */
export function clearValues(node: Node) {
    let storageKey: keyof Node = getConfig('nodeDataKey');
    if (node[storageKey] == null) { return; }
    delete node[storageKey];
}

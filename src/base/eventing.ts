/**  A set of helpers to define eventing methods on objects */

import { immediate } from './async';

type Callback = (...args: any[]) => void;

export interface EventEmitter {
    __eventRegistrations: Record<string, Callback[]>;
    on(eventType: string, callback: Callback): void;
    once(eventType: string, callback: Callback): void;
    removeListener(eventType: string, callback: Callback): void;
}

// Add event registration method to the object
// @param [String] eventType the type of event
// @param [Function] callback the callback to call
function on(this: EventEmitter, eventType: string, callback: Callback) {
    let registrations = this.__eventRegistrations || (this.__eventRegistrations = { });

    if (!registrations[eventType]) {
        registrations[eventType] = [ ];
    }
    registrations[eventType].push(callback);
}

// Adds an event registration that will only be called once
// and after called it will unregister
// @param [String] eventType the type of event
// @param [Function] callback the callback to call
function once(this: EventEmitter, eventType: string, callback: Callback) {
    let wrappedCallback = (...args: any[]) => {
        callback.apply(this, args);
        this.removeListener(eventType, wrappedCallback);
    };

    // register through previous handler
    this.on(eventType, wrappedCallback);
}

// Remove event registration method from the object
// @param [String] eventType the type of event
// @param [Function] callback the callback to call
function removeListener(this: EventEmitter, eventType: string, callback: Callback) {
    let registrations = this.__eventRegistrations;

    if ((registrations != null ? registrations[eventType] : undefined) != null) {
        // remove the callback
        registrations[eventType] = (registrations[eventType].filter((reg) => reg !== callback));
    }
}

// Emit an event on this object
// @param [String] eventType the type of event to emit
// @param [Array] args a set of arguments to pass
// @param [Boolean] async whether or not to perform this emit async
function emit(this: EventEmitter, eventType: string, args: any[], async = true) {
    // only attempt an emit if registrations exist
    if ((this.__eventRegistrations == null) || (this.__eventRegistrations[eventType] == null)) { return; }

    // capture the callback array so callbacks can be removed
    // while traversing and not affect the loop
    let callbacks = this.__eventRegistrations[eventType];
    let emitCallback = () => {
        for (let callback of callbacks) {
            callback.apply(this, args);
        }
    };

    if (async) {
        immediate(emitCallback);
    } else {
        emitCallback();
    }
}

// Takes the given element and adds the eventing methods to it
// @param [Object] obj an object to add eventing methods to
export function add<T>(obj: T): T & EventEmitter {
    // Map methods to the object, they use `this` references to access the
    // registrations so new closures are not generated every time.
    //
    // Notice we are not creating the registrations object, this will be
    // created on demand to avoid unnecessary object creation.
    (obj as any).on = on;
    (obj as any).once = once;
    (obj as any).removeListener = removeListener;
    (obj as any).emit = emit;

    // return object for convenience but not necessary
    return obj as T & EventEmitter;
}

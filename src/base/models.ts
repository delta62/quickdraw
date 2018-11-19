import { getInternalValue } from './storage';
import { getConfig } from './config';

export interface Model<T> {
    raw: T;
    __isModel: boolean;
    __parent: Model<never> | null;
}

/**
 * Converts a model into a quickdraw model if it
 * is not already one, this lets primitive content
 * become models where normally they cannot
 * @param obj a raw data model
 * @return qdmodel that encapsulates the given raw model
 */
export function create<T>(obj: T): Model<T> {
    if (isModel<T>(obj)) return obj;

    // Construct a new model wrapper
    return {
        raw: obj,
        __isModel: true,
        __parent: null
    };
}

/**
 * Tells whether or not an object is a model
 * @param obj an object to check if it is a model
 * @return whether or not given object is an internal quickdraw model
 */
export function isModel<T>(obj: any): obj is Model<T> {
    return obj != null && !!obj.__isModel;
}

/**
 * Gives the internal binding model for a given dom node if there is one
 * @param domNode the node that has been previously bound
 * @return a quickdraw object that was bound to the node null if the given node was not bound
 */
export function get(node: HTMLElement) {
    return getInternalValue(node, getConfig('baseModelKey'));
}

/**
 * Sets the parent of the given model
 * @param model the model to set the parent of
 * @param parent the object to be the parent of this model
 * @note if the given model is not a model, nothing is done
 */
export function setParent<T, U>(model: Model<T>, parent: Model<U>) {
    // we cannot set a parent if:
    // - the given object is not a model
    // - the given parent does not exist
    // - the model and parent are the same thing (cyclic models are bad)
    if (!isModel(model) || !parent || (model as any) === parent) return;
    (model as any).__parent = parent;
}

/**
 * Gets the parent of the given model
 * @param model the model to get the parent of
 * @return the parent model of the given if there is one null otherwise
 */
export function getParent<T, U>(model: Model<T>): Model<U> | null {
    if (!isModel(model)) return null;
    return model.__parent;
}

/**
 * Unwraps a quickdraw model if given one
 * @param model a possible quickdraw model to be unwrapped
 * @return The unwrapped model if the given object is a quickdraw model otherwise the given object is returned
 */
export function unwrap<T>(model: Model<T> | T): T {
    return isModel(model) ? model.raw : model;
}

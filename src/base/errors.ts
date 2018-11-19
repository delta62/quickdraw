import { unwrap as unwrapDom } from './dom';
import { unwrap as unwrapModel } from './models';

/**
 * A custom error class that can be used to provide stateful error information from within quickdraw when an error
 * occurs
 */
export class QuickdrawError {
    public  duringBinding: boolean;
    private error: any;
    private context: never;
    private observable: never;
    private domNode: never;
    private handler: never;
    private viewModel: never;

    constructor(public message: string, originalError: any) {
        this.duringBinding = qdInternal.state.current.element !== null;
        this.error = originalError;
        this.context = null;
        this.observable = null;
        this.domNode = qdInternal.dom.unwrap(qdInternal.state.current.element != null ? qdInternal.state.current.element : null);
        this.handler = qdInternal.state.current.handler != null ? qdInternal.state.current.handler : null;
        this.viewModel = (qdInternal.models.unwrap(qdInternal.state.current.model)) != null ? left : null;
    }

    /**
     * If quickdraw caught an error and is sending it along, store the original error so it can be accessed (if
     * applicable)
     * @param error the original error that occurred
     */
    setOriginalError(error: any) {
        this.error = error;
    }

    /**
     * Set the binding context the error occurred in (if applicable)
     * @param context the binding context in  which the error occurred
     */
    setBindingContext(context: never) {
        this.context = context;
    }

    /**
     * Set the dom node that was in use during the error (if applicable)
     * @param [DomNode] domNode in use during the error
     */
    setDomNode(domNode) {
        this.domNode = unwrap(domNode);
    }

    /**
     * Set the observable that caused this error (if applicable)
     * @param [QDObservable] observable that caused the error
     */
    setObservable(observable) {
        this.observable = observable;
    }

    /**
     * Set the view model that caused this error (if applicable)
     * @param [QDModel] viewModel the model in use during the error
     */
    setViewModel(viewModel) {
        if (viewModel == null) return;
        this.viewModel = qdInternal.models.unwrap(viewModel);
    }

    // @return [Object] all known details about the error
    errorInfo() {
        return this._current;
    }
}

/**
 * Handles an error that has occurred in the system. If a custom error handler has registered then it will be triggered,
 * otherwise the given error will be thrown
 * @note if an error is not a QuickdrawError it will be wrapped
 * @param error a descriptive error object
 */
export function throwError(error: any) {
    if (qdInternal.state.error.handlers.length === 0) {
        throw error;
    }

    // if there are registered handlers, call them all
    for (let handler of qdInternal.state.error.handlers) {
        handler(error);
    }
}

// Registers a given callback to be notified when an error occurs
// @param [Function] callback the function that will handle errors
export function registerErrorHandler(callback) {
    qdInternal.state.error.handlers.push(callback);
}

import { Model } from './models';
import { ErrorHandler, state } from './state';
import { Observable } from './observables';
import { VirtualDomNode, unwrap as unwrapDom } from './dom';
import { unwrap as unwrapModel } from './models';

/**
 * A custom error class that can be used to provide stateful error information from within quickdraw when an error
 * occurs
 */
export class QuickdrawError {
    public  duringBinding: boolean;
    public error: any;
    public context: never | null;
    public observable: never | null;
    public domNode: HTMLElement | null;
    public handler: never | null;
    public viewModel: never | null;

    constructor(public message: string, originalError?: any) {
        this.duringBinding = state.current.element !== null;
        this.error = originalError;
        this.context = null;
        this.observable = null;
        this.domNode = unwrapDom(state.current.element);
        this.handler = state.current.handler || null;
        this.viewModel = unwrapModel(state.current.model) || null;
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
     * @param domNode in use during the error
     */
    setDomNode(domNode: VirtualDomNode | HTMLElement) {
        this.domNode = unwrapDom(domNode);
    }

    /**
     * Set the observable that caused this error (if applicable)
     * @param observable that caused the error
     */
    setObservable(observable: Observable<any>) {
        this.observable = observable;
    }

    /**
     * Set the view model that caused this error (if applicable)
     * @param [QDModel] viewModel the model in use during the error
     */
    setViewModel(viewModel: Model<any> | any) {
        if (!viewModel) return;
        this.viewModel = unwrapModel(viewModel);
    }

    /**
     * @return [Object] all known details about the error
     */
    errorInfo() {
        return this.error;
    }
}

/**
 * Handles an error that has occurred in the system. If a custom error handler has registered then it will be triggered,
 * otherwise the given error will be thrown
 * @note if an error is not a QuickdrawError it will be wrapped
 * @param error a descriptive error object
 */
export function throwError(error: any) {
    if (state.error.handlers.length === 0) {
        throw error;
    }

    // if there are registered handlers, call them all
    for (let handler of state.error.handlers) {
        handler(error);
    }
}

/**
 * Registers a given callback to be notified when an error occurs
 * @param callback the function that will handle errors
 */
export function registerErrorHandler(callback: ErrorHandler) {
    state.error.handlers.push(callback);
}

/*
 * decaffeinate suggestions:
 * DS104: Avoid inline assignments
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Functions related to error handling in quickdraw
let QuickdrawError;
qdInternal.errors = {
    // Handles an error that has occurred in the system. If
    // a custom error handler has registered then it will be
    // triggered, otherwise the given error will be thrown
    // @note if an error is not a QuickdrawError it will be
    // wrapped
    // @param [Mixed] error a descriptive error object
    throw(error) {
        if (qdInternal.state.error.handlers.length === 0) {
            throw error;
        }

        // if there are registered handlers, call them all
        for (let handler of qdInternal.state.error.handlers) {
            handler(error);
        }
        // dont return the call results
    }
};

// A custom error class that can be used to provide stateful
// error information from within quickdraw when an error occurs
qdInternal.errors.QuickdrawError = (QuickdrawError = class QuickdrawError {
    constructor(message, originalError) {
        let left;
        this.message = message;

        // Additional information
        this._current = {
            duringBinding : qdInternal.state.current.element !== null,
            error : originalError,
            context : null,
            observable : null,
            domNode : qdInternal.dom.unwrap(qdInternal.state.current.element != null ? qdInternal.state.current.element : null),
            handler : qdInternal.state.current.handler != null ? qdInternal.state.current.handler : null,
            viewModel : (left = qdInternal.models.unwrap(qdInternal.state.current.model)) != null ? left : null
        };
    }

    // If quickdraw caught an error and is sending it along, store
    // the original error so it can be accessed (if applicable)
    // @param [Error] error the original error that occurred
    setOriginalError(error) {
        this._current.error = error;
    }

    // Set the binding context the error occurred in (if applicable)
    // @param [Context] context the binding context in  which the error occurred
    setBindingContext(context) {
        this._current.context = context;
    }

    // Set the dom node that was in use during the error (if applicable)
    // @param [DomNode] domNode in use during the error
    setDomNode(domNode) {
        this._current.domNode = qdInternal.dom.unwrap(domNode);
    }

    // Set the observable that caused this error (if applicable)
    // @param [QDObservable] observable that caused the error
    setObservable(observable) {
        this._current.observable = observable;
    }

    // Set the view model that caused this error (if applicable)
    // @param [QDModel] viewModel the model in use during the error
    setViewModel(viewModel) {
        if (viewModel == null) { return; }
        this._current.viewModel = qdInternal.models.unwrap(viewModel);
    }

    // @return [Object] all known details about the error
    errorInfo() {
        return this._current;
    }
});

// Registers a given callback to be notified when an error occurs
// @param [Function] callback the function that will handle errors
qd.registerErrorHandler = function(callback) {
    qdInternal.state.error.handlers.push(callback);
};

/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Provides a set of wrappers around async timers so that we can
// add error handling to all async calls
qdInternal.async = {
    // Sets a callback to happen as soon as possible once
    // the current call thread has finished
    // @param [Function] callback the function to call later
    // @return a timer id that can be used to cancel this async request
    immediate(callback) {
        return qdInternal.async.delayed(callback);
    },

    // Sets a callback to happen after the given number of milliseconds passes
    // @param [Function] callback the function to call later
    // @param [Integer] time the amount of time to wait before calling
    // @return a timer id that can be used to cancel this async request
    delayed(callback, time = 0) {
        let wrappedCallback = function() {
            try {
                return callback();
            } catch (err) {
                return qdInternal.errors.throw(new QuickdrawError('Error occurred on async callback', err));
            }
        };

        return setTimeout(wrappedCallback, time);
    },

    // Attempts to cancel the timer associated with the given id if possible
    // @param [Integer] timerId the id of the timer to cancel
    cancel(timerId) {
        clearTimeout(timerId);
    }
};
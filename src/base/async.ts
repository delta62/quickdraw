import { QuickdrawError, throwError } from './errors';

type Callback = (...args: any[]) => void;
type TimerId = number;

/**
 * Provides a set of wrappers around async timers so that we can add error handling to all async calls
 */
export function immediate(callback: Callback): TimerId {
    return delayed(callback);
}

/**
 * Sets a callback to happen after the given number of milliseconds passes
 * @param callback the function to call later
 * @param time the amount of time to wait before calling
 * @return a timer id that can be used to cancel this async request
 */
export function delayed(callback: Callback, time: number = 0): TimerId {
    let wrappedCallback = function() {
        try {
            callback();
        } catch (err) {
            throwError(new QuickdrawError('Error occurred during async callback', err));
        }
    };

    return setTimeout(wrappedCallback, time);
}

/**
 * Attempts to cancel the timer associated with the given id if possible
 * @param timerId the id of the timer to cancel
 */
export function cancel(timerId: TimerId) {
    clearTimeout(timerId);
}

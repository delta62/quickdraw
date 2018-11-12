/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Internal.Async", function() {
    describe("immediate(callback)", () =>
        it("updates scheduled for the next available time slot", function() {
            let res = sandbox.qd._.async.immediate(function() {});
            clearTimeout(res);

            assert.isTrue(sandbox.setTimeout.calledOnce, "Should have called setTimeout");
            return assert.equal(sandbox.setTimeout.firstCall.args[1], 0, "Second argument should be 0");
        })
    );

    describe("delayed(callback, time)", function() {
        it("updates scheduled for given time", function() {
            let res = sandbox.qd._.async.delayed((function() {}), 50);
            clearTimeout(res);

            assert.isTrue(sandbox.setTimeout.calledOnce, "Should have called setTimeout");
            return assert.equal(sandbox.setTimeout.firstCall.args[1], 50, "Should use the timeout given");
        });

        it("defaults to immediate if no time given", function() {
            let res = sandbox.qd._.async.delayed(function() {});
            clearTimeout(res);

            assert.isTrue(sandbox.setTimeout.calledOnce, "Should have called setTimeout");
            return assert.equal(sandbox.setTimeout.firstCall.args[1], 0, "should use a timeout of 0");
        });

        it("Given callback is executed", function() {
            let realCallback = sinon.stub();
            let res = sandbox.qd._.async.delayed(realCallback);
            clearTimeout(res);

            assert.isTrue(sandbox.setTimeout.calledOnce, "Should have called setTimeout");

            let wrappedCallback = sandbox.setTimeout.firstCall.args[0];
            wrappedCallback();

            return assert.isTrue(realCallback.calledOnce, "Should have called the real callback");
        });

        return it("if given callback throws an error it is caught and delegated", function() {
            let errorSpy = (sandbox.qd._.errors.throw = sinon.spy());
            let realError = new Error("THIGNS BROKE!");
            let res = sandbox.qd._.async.delayed(function() {
                throw realError;
            });
            clearTimeout(res);

            assert.isTrue(sandbox.setTimeout.calledOnce, "Should have called setTimeout");
            
            let wrappedCallback = sandbox.setTimeout.firstCall.args[0];
            wrappedCallback();

            assert.isTrue(errorSpy.calledOnce, "Should have called the error handler");
            return assert.equal(errorSpy.firstCall.args[0].errorInfo().error, realError, "Real error is passed through quickdraw error");
        });
    });

    return describe("cancel(timerId)", () =>
        it("calls the clearTimeout method with given value", function() {
            sandbox.qd._.async.cancel(20);

            assert.isTrue(sandbox.clearTimeout.calledOnce, "Should have called clearTimeout");
            return assert.equal(sandbox.clearTimeout.firstCall.args[0], 20, "Should pass the given value");
        })
    );
});
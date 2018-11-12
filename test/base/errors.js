/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Internal.Error", () =>
    describe('throw(throwable)', function() {
        it('Error is thrown normally if no registered handlers', function() {
            let throwItem = new Error();
            return expect(() => sandbox.qd._.errors.throw(throwItem)).to.throw(throwItem);
        });

        return it('Error is passed to handler if one is registered', function() {
            let registered = sinon.spy();
            sandbox.qd.registerErrorHandler(registered);

            let throwItem = new Error();
            sandbox.qd._.errors.throw(throwItem);

            assert.isTrue(registered.calledOnce, "Should call registered binding handler");
            return assert.equal(registered.firstCall.args[0], throwItem, "Item to be thrown is passed");
        });
    })
);
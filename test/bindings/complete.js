/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe('Quickdraw.Bindings.Complete', function() {
    it('Handler is bound to complete keyword', assertModuleBound('complete'));

    it('Errors if given binding data is not a function', function() {
        let callback = qdGetInitialize('complete');
        let errorSpy = (sandbox.qd._.errors.throw = sinon.spy());
        callback({});
        return assert.isTrue(errorSpy.called, "Should have thrown an error for non-function data");
    });

    return it('Given callback is called with bound node, and after binding complete', function(cb) {
        let callback = qdGetInitialize('complete');
        let dom = sandbox.document.createElement('div');
        return callback(function() {
            assert(true, "Is called");
            return cb();
        }
        , dom);
    });
});

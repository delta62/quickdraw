/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Handlers", () =>
    describe("registerBindingHandler(keyword, handler, follows, override)", function() {
        it("New binding handler registered and associated with keyword", function() {
            let testHandler = {
                initialize : sinon.stub(),
                update : sinon.stub(),
                cleanup : sinon.stub()
            };
            
            sandbox.qd.registerBindingHandler("test", testHandler);

            assert.equal(sandbox.qd._.handlers.getInitialize('test'), testHandler.initialize, "Test initialize associated with keyword");
            assert.equal(sandbox.qd._.handlers.getUpdate('test'), testHandler.update, "Test update associated with keyword");
            return assert.equal(sandbox.qd._.handlers.getCleanup('test'), testHandler.cleanup, "Test cleanup associated with keyword");    
        });

        it("Repeat binding handler throws error", function() {
            let spy = sinon.spy(sandbox.qd, "registerBindingHandler");

            let testBinder1 = { update : sinon.stub() };
            let testBinder2 = { update : sinon.stub() };
            testBinder1 = sandbox.qd.registerBindingHandler("test", testBinder1);
            expect(() => testBinder2 = sandbox.qd.registerBindingHandler("test", testBinder2)).to.throw(sandbox.qd._.errors.QuickdrawError);

            assert.isTrue(spy.threw(), "Binding handler registration threw exception on doubled handler");
            return assert.equal(sandbox.qd._.handlers.getUpdate('test'), testBinder1.update, "Test handler is the original one, second attempt ignored");
        });

        it("Repeat binding handler doesn't throw error when override permitted", function() {
            let spy = sinon.spy(sandbox.qd, "registerBindingHandler");

            let testBinder1 = { update : sinon.stub() };
            let testBinder2 = { update : sinon.stub() };
            testBinder1 = sandbox.qd.registerBindingHandler("test", testBinder1);
            expect(() => testBinder2 = sandbox.qd.registerBindingHandler("test", testBinder2, [], true)).to.not.throw(sandbox.qd._.errors.QuickdrawError);

            assert.isFalse(spy.threw(), "Binding handler registration threw exception on doubled handler");
            return assert.equal(sandbox.qd._.handlers.getUpdate('test'), testBinder2.update, "Test handler is the second one, original handler overriden");
        });

        it("Every handler must have at least an initialize or update method", function() {
            let errorSpy = sinon.stub(sandbox.qd._.errors, "throw");
            sandbox.qd.registerBindingHandler("test", {});

            assert.isTrue(errorSpy.called, "Should have thrown an error because of missing initialize/update method");

            errorSpy.reset();
            sandbox.qd.registerBindingHandler("test", { initialize() {} });
            assert.isFalse(errorSpy.called, "Should not have thrown an error because initialize was specified");

            errorSpy.reset();
            sandbox.qd.registerBindingHandler("test2", { update() {} });
            return assert.isFalse(errorSpy.called, "Should not have thrown an error beacuse update was specified");
        });

        return it("Handler ordering takes dependencies into account", function() {
            // wipe default handlers
            sandbox.qd._.state.binding.handlers = {};

            sandbox.qd.registerBindingHandler("test", { initialize() {} });
            assert.deepEqual(sandbox.qd._.state.binding.order, ["test"], "Should have only one thing in the order");

            sandbox.qd.registerBindingHandler("test2", { initialize() {} }, ["test", "test3"]);
            assert.deepEqual(sandbox.qd._.state.binding.order, ["test", "test2"], "Should have test2 following test because of dependency");

            sandbox.qd.registerBindingHandler("test3", { initialize() {} }, ["test4"]);
            return assert.deepEqual(sandbox.qd._.state.binding.order, ["test", "test3", "test2"], "Should have test2 following both test and test3");
        });
    })
);

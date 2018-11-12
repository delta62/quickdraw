/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Internal.Eventing", () =>
    describe("addEventing(obj)", function() {
        beforeEach(function() {
            sandbox.simpleObject = {};
            return sandbox.qd._.eventing.add(sandbox.simpleObject);
        });

        it("Objects have event methods added to them after call", function() {
            let { simpleObject } = sandbox;

            assert.isTrue((simpleObject.on != null), "Should have 'on' registration method");
            assert.isTrue((simpleObject.once != null), "Should have 'once' registration method");
            assert.isTrue((simpleObject.removeListener != null), "Should have 'removeListener' method");
            return assert.isTrue((simpleObject.emit != null), "Should have 'emit' method");
        });

        it("Methods registered via 'on' called every time registed event fired", function() {
            let { simpleObject } = sandbox;

            let handler = sinon.spy();
            simpleObject.on('testCall', handler);

            for (let i = 0; i < 10; i++) {
                simpleObject.emit('testCall', [], false);
            }

            return assert.equal(handler.callCount, 10, "Should have called test handler 10 times");
        });

        it("Methods registered via 'once' called only on first event and never again", function() {
            let { simpleObject } = sandbox;

            let handler = sinon.spy();
            simpleObject.once('testCall', handler);

            for (let i = 0; i < 10; i++) {
                simpleObject.emit('testCall', [], false);
            }

            return assert.equal(handler.callCount, 1, "Should only call method once");
        });

        it("Handler is removed if requested", function() {
            let { simpleObject } = sandbox;

            let handler = sinon.spy();
            simpleObject.on('testCall', handler);

            simpleObject.emit('testCall', [], false);

            simpleObject.removeListener('testCall', handler);

            simpleObject.emit('testCall', [], false);

            return assert.isTrue(handler.calledOnce, "Should only have been called once since removed before second call");
        });

        it("Emit properly calls all handlers registered for event", function() {
            let { simpleObject } = sandbox;

            let handlers = [];
            for (let i = 0; i < 5; i++) {
                let handler = sinon.spy();
                simpleObject.on('testCall', handler);
                handlers.push(handler);
            }

            simpleObject.emit('testCall', [], false);

            for (let handle of handlers) {
                assert.isTrue(handle.calledOnce, "Should call each handle once");
            }

            // remove implicit return
        });

        it("Emit defaults to an async call", function() {
            let { simpleObject } = sandbox;
            simpleObject.on('testCall', function() {});

            let asyncSpy = (sandbox.qd._.async.immediate = sinon.spy());

            simpleObject.emit('testCall', []);

            return assert.isTrue(asyncSpy.calledOnce, "Should have tried to setup async call");
        });

        it("Registrations removed before async call executed are still executed", function() {
            let { simpleObject } = sandbox;
            let handler = sinon.spy();
            simpleObject.on('testCall', handler);

            let asyncSpy = (sandbox.qd._.async.immediate = sinon.spy());

            simpleObject.emit('testCall', []);

            assert.isFalse(handler.called, "Should not have called handler yet since async");

            simpleObject.removeListener('testCall', handler);
            // call async call now
            asyncSpy.firstCall.args[0]();

            return assert.isTrue(handler.calledOnce, "Should have called handler now since registered on initial emit");
        });

        it("Arguments given to emit are given to callback", function() {
            let { simpleObject } = sandbox;

            let handler = sinon.spy();
            simpleObject.on('testCall', handler);

            let args = [1, 2, 3];
            simpleObject.emit('testCall', args, false);

            assert.isTrue(handler.calledOnce, "Should have called handler");
            assert.equal(args.length, handler.firstCall.args.length, "Correct number of arguments given");
            for (let i = 0; i < args.length; i++) {
                let arg = args[i];
                assert.equal(arg, handler.firstCall.args[i], `Argument ${i} in correct order`);
            }

            // remove implicit return
        });

        return it("'this' of callback is the object", function() {
            let { simpleObject } = sandbox;

            let ranCheck = false;
            let handler = sinon.spy(function() {
                assert.equal(simpleObject, this, "Should have passed object as 'this'");
                return ranCheck = true;
            });
            simpleObject.on('testCall', handler);

            simpleObject.emit('testCall', [], false);

            return assert.isTrue(ranCheck, "Should have run handler");
        });
    })
);
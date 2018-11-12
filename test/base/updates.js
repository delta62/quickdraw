/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Updates.Internal", function() {
    describe("run()", function() {
        it("cancels current timer if there is one", function() {
            sandbox.qd._.updates.updateNodeSet = function() {};
            let timeoutSpy = (sandbox.qd._.async.cancel = sinon.spy());
            sandbox.qd._.state.updates.key = 2;
            sandbox.qd._.state.updates.immediate = true;
            sandbox.qd._.updates.run();
            assert.isTrue(timeoutSpy.calledWith(2), "Should have cancelled current timeout");
            assert.isNull(sandbox.qd._.state.updates.key, "Should have set key back to null");
            return assert.isFalse(sandbox.qd._.state.updates.immediate, "Should have set immediate back to false");
        });

        return it("Does not apply updates if updates disabled", function() {
            sandbox.qd.setConfig('updatesEnabled', false);
            let updateSpy = (sandbox.qd._.updates.updateNodeSet = sinon.spy());
            sandbox.qd._.state.updates.queue = [1,2,3,4];
            sandbox.qd._.updates.run();
            assert.isFalse(updateSpy.called, "Should not have called update node set as updates are disabled");
            return assert.equal(sandbox.qd._.state.updates.queue.length, 4, "Should not have cleared out update queue");
        });
    });

    describe("updateNodeSet(nodes)", () =>
        it("calls update dom node for every valid dom node", function() {
            let items = [];
            for (let i = 0; i < 20; i++) {
                let elm = sandbox.document.createElement("div");
                if (i < 10) {
                    sandbox.qd._.storage.setInternalValue(elm, sandbox.qd.getConfig('baseModelKey'), {});
                }
                items.push(elm);
            }
            
            let updateSpy = sinon.stub(sandbox.qd._.binding, 'updateDomNode');
            let cacheSpy = sinon.stub(sandbox.qd._.templates, 'clearCache');
            let renderSpy = sinon.stub(sandbox.qd._.renderer, 'schedule');

            sandbox.qd._.updates.updateNodeSet(items);

            assert.equal(updateSpy.callCount, 10, "Should have called update on 10 nodes");

            assert.isTrue(cacheSpy.called, 'Should have triggered a cache cleanup');
            return assert.isTrue(renderSpy.called, 'Should have scheduled a render');
        })
    );

    describe("schedule(immediately)", function() {
        it("if called without queue of max size, delayed update scheduled", function() {
            let delaySpy = (sandbox.qd._.async.delayed = sinon.spy());
            sandbox.qd._.updates.schedule();
            return assert.isTrue(delaySpy.calledWith(sandbox.qd._.updates.run, sandbox.qd.getConfig('defaultUpdateTimeout')), "Should have set delayed update");
        });

        it("if called with queue over max size, immediate update scheduled", function() {
            let immediateSpy = (sandbox.qd._.async.immediate = sinon.spy());
            sandbox.qd._.state.updates.queue = [1,2,3,4];
            sandbox.qd.setConfig('maxQueuedUpdates', 1);
            sandbox.qd._.updates.schedule();
            return assert.isTrue(immediateSpy.calledWith(sandbox.qd._.updates.run), "Should have set immediate update");
        });

        return it("if called with immediate, immediate update scheduled", function() {
            let immediateSpy = (sandbox.qd._.async.immediate = sinon.spy());
            sandbox.qd._.updates.schedule(true);
            return assert.isTrue(immediateSpy.calledWith(sandbox.qd._.updates.run), "Should have set immediate update");
        });
    });

    return describe("enqueue(domNode)", function() {
        it("enqueues a given node into the update queue", function() {
            let fakeNode = {};
            sandbox.qd._.updates.enqueue(fakeNode);
            return assert.isTrue(__in__(fakeNode, sandbox.qd._.state.updates.queue), "Should have node in queue");
        });

        return it("Prevents double enqueuing of the same node", function() {
            let fakeNode = {};
            sandbox.qd._.updates.enqueue(fakeNode);
            sandbox.qd._.updates.enqueue(fakeNode);
            return assert.equal(sandbox.qd._.state.updates.queue.length, 1, "Should only have one thing enqueued");
        });
    });
});

describe("Quickdraw.Updates.External", function() {
    describe("disableUpdates()", function() {
        it("When updates are disabled configuration is set", function() {
            sandbox.qd.disableUpdates();
            return assert.isFalse(sandbox.qd._.config.updatesEnabled, "Should disable updates in configuration");
        });

        return it("When updates are disabled pending updates are cancelled", function() {
            let cancelSpy = (sandbox.qd._.async.cancel = sinon.spy());

            sandbox.qd.disableUpdates();

            return assert.isTrue(cancelSpy.calledOnce, "Should have called cancel");
        });
    });

    return describe("enableUpdates()", function() {
        it("When updates are reenabled configuration is set", function() {
            sandbox.qd._.config.updatesEnabled = "foo";
            assert.equal(sandbox.qd.getConfig('updatesEnabled'), "foo", "fake variable observed");
            sandbox.qd.enableUpdates();

            return assert.isTrue(sandbox.qd.getConfig('updatesEnabled'), "updates enabled properly set");
        });

        it("If no updates available not updates are scheduled", function() {
            let spy = (sandbox.qd._.updates.schedule = sinon.spy());

            sandbox.qd.enableUpdates();
            return assert.isFalse(spy.called, "Should not have called schedule updates");
        });

        it("If updates available when enabled they are scheduled", function() {
            sandbox.qd._.state.updates.queue = [1,2,3];
            let spy = (sandbox.qd._.updates.schedule = sinon.spy());

            sandbox.qd.enableUpdates();
            assert.isTrue(spy.calledOnce, "Should call schedule updates when updates in queue");
            return assert.isTrue(spy.firstCall.args[0], "Should have been called with immediate");
        });

        return it("if requested run the queue before returning", function() {
            sandbox.qd._.state.updates.queue = [1,2,3];
            let spy = (sandbox.qd._.updates.schedule = sinon.spy());
            let runSpy = (sandbox.qd._.updates.run = sinon.spy());

            sandbox.qd.enableUpdates(true);
            assert.isTrue(spy.calledWith(true), "Should have called schedule updates");
            return assert.isTrue(runSpy.called, "Should have called run synchronously");
        });
    });
});
function __in__(needle, haystack) {
  return Array.from(haystack).indexOf(needle) >= 0;
}
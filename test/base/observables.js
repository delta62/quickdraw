/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Observables", function() {
    describe("observable():", function() {
        it("Function returned has initial value passed", function() {
            let numWrap = sandbox.qd.observable(2);
            assert.equal(numWrap(), 2, "Integer returned properly");

            let boolWrap = sandbox.qd.observable(true);
            assert.equal(boolWrap(), true, "Boolean returned properly");

            let stringWrap = sandbox.qd.observable("Hello World");
            assert.equal(stringWrap(), "Hello World", "String returned properly");

            return assert.equal(numWrap.raw, null, "No model initially attached to observable");
        });

        it("Function value updates properly", function() {
            let numWrap = sandbox.qd.observable(2);
            numWrap(10);
            assert.equal(numWrap(), 10, "Integer updated properlty");

            let boolWrap = sandbox.qd.observable(true);
            boolWrap(false);
            assert.equal(boolWrap(), false, "Boolean updated properly");

            let stringWrap = sandbox.qd.observable("Hello World");
            stringWrap("Goodbye World");
            return assert.equal(stringWrap(), "Goodbye World", "String updated properly");
        });

        it("Function value is allowed to change types", function() {
            let wrapper = sandbox.qd.observable(2);
            assert.equal(wrapper(), 2, "Initial value correct");
            wrapper(false);
            assert.equal(wrapper(), false, "Update to boolean okay");
            wrapper("world");
            assert.equal(wrapper(), "world", "Update to string okay");
            wrapper(null);
            return assert.isNull(wrapper(), "Set value to null okay");
        });

        return it("Observable enqueues dependencies when updated", function() {
            // prevent actual updates from occuring
            let scheduleStub = sinon.stub(sandbox.qd._.updates, 'schedule');
            let wrapped = sandbox.qd.observable(1);
            let fakeModel = {things : "stuff"};
            let element = sandbox.document.createElement("div");
            sandbox.qd._.storage.setInternalValue(element, 'handlers', {});
            sandbox.qd._.observables.addDependency.call(wrapped, fakeModel, element);
            wrapped(23);
            assert.equal(sandbox.qd._.state.updates.queue.length, wrapped.__dependencies.length, "All dependencies enqueued");
            for (let i = 0; i < wrapped.__dependencies.length; i++) {
                let dependency = wrapped.__dependencies[i];
                assert.equal(sandbox.qd._.state.updates.queue[i], dependency.domNode, "All dependencies correct");
            }
            return assert.isTrue(scheduleStub.called, 'Should have called schedule stub to setup next update');
        });
    });

    describe("observableArray():", function() {
        it("Function returned has initial value passed", function() {
            let initialData = [1, 2, 3];
            let wrapped = sandbox.qd.observableArray(initialData);
            return assert.equal(wrapped(), initialData, "Initial data correctly stored");
        });

        it("Index of works properly", function() {
            let initialData = [1, 2, 3];
            let wrapped = sandbox.qd.observableArray(initialData);
            assert.equal(wrapped.indexOf(2), 1, "Correct index found");
            return assert.equal(wrapped.indexOf(4), -1, "-1 on error");
        });

        it("Slice calls the slice of the internal array", function() {
            let initialData = [1, 2, 3];
            let wrapped = sandbox.qd.observableArray(initialData);
            sinon.spy(wrapped.value, "slice");
            wrapped.slice(1, 2);
            return assert.isTrue(wrapped.value.slice.calledOnce, "Internal slice called");
        });

        it("Push adds internally and calls signal update", function() {
            let wrapped = sandbox.qd.observableArray();
            let spy = sinon.spy(sandbox.qd._.observables, "updateDependencies");
            wrapped.push(1);
            assert.isTrue(spy.calledOnce, "Called update dependencies");
            assert.equal(wrapped().length, 1, "Array has 1 item now");
            return assert.equal(wrapped()[0], 1, "Item given is added");
        });

        it("Pop removes internally and calls signal update", function() {
            let wrapped = sandbox.qd.observableArray([2]);
            let spy = sinon.spy(sandbox.qd._.observables, "updateDependencies");
            assert.equal(wrapped.pop(), 2, "Item poped off and returned");
            assert.isTrue(spy.calledOnce, "Called update dependencies");
            return assert.equal(wrapped().length, 0, "Array has no items");
        });

        it("Unshift adds internally and calls signal update", function() {
            let wrapped = sandbox.qd.observableArray();
            let spy = sinon.spy(sandbox.qd._.observables, "updateDependencies");
            wrapped.unshift("hi");
            assert.isTrue(spy.calledOnce, "Called update dependencies");
            assert.equal(wrapped().length, 1, "Array has 1 item now");
            return assert.equal(wrapped()[0], "hi", "Item given is added");
        });

        it("Shift removes internally and calls signal update", function() {
            let wrapped = sandbox.qd.observableArray([1]);
            let spy = sinon.spy(sandbox.qd._.observables, "updateDependencies");
            assert.equal(wrapped.shift(), 1, "Value is removed and returned");
            assert.isTrue(spy.calledOnce, "Called update dependencies");
            return assert.equal(wrapped().length, 0, "No items left in the array");
        });

        it("Reverse interally reverse and updates", function() {
            let wrapped = sandbox.qd.observableArray([1, 2]);
            let spy = sinon.spy(sandbox.qd._.observables, "updateDependencies");
            wrapped.reverse();

            assert.isTrue(spy.calledOnce, "Called update dependencies");
            assert.equal(wrapped()[0], 2, "2 is first");
            return assert.equal(wrapped()[1], 1, "1 is second");
        });

        it("Sort internally sorts and updates", function() {
            let wrapped = sandbox.qd.observableArray([2, 1]);
            let spy = sinon.spy(sandbox.qd._.observables, "updateDependencies");
            wrapped.sort();

            assert.isTrue(spy.calledOnce, "Called update dependencies");
            assert.equal(wrapped()[0], 1, "1 is first");
            return assert.equal(wrapped()[1], 2, "2 is second");
        });

        it("Splice calls internal splice and updates", function() {
            let wrapped = sandbox.qd.observableArray([1, 4]);
            let stub = sinon.stub(sandbox.qd._.observables, "updateDependencies");
            let stub2 = sinon.stub(wrapped.value, "splice");

            wrapped.splice(1, 0, 2, 3);

            assert.isTrue(stub.calledOnce, "Called update dependencies");
            assert.isTrue(stub2.calledOnce, "Called splice internally");

            let [start, deleteCount, ...elements] = Array.from(stub2.firstCall.args);
            assert.equal(start, 1, "Didn't pass correct start position");
            assert.equal(deleteCount, 0, "Didn't pass correct delete count");
            return assert.deepEqual(elements, [2, 3], "Didn't pass new elements to splice");
        });

        it("Remove takes out all the matching items", function() {
            let wrapped = sandbox.qd.observableArray([1, 2, 2, 2, 3]);
            let stub = sinon.stub(sandbox.qd._.observables, "updateDependencies");
            let removed = wrapped.remove(2);

            assert.isTrue(stub.calledOnce, "Called update dependencies");
            assert.equal(removed.length, 3, "Removed all the items");
            return assert.equal(wrapped().length, 2, "Items left over");
        });

        it("Remove takes out all items matching function", function() {
            let wrapped = sandbox.qd.observableArray([1, 2, 2, 2, 3]);
            let stub = sinon.stub(sandbox.qd._.observables, "updateDependencies");
            let removed = wrapped.remove(item => item === 2);

            assert.isTrue(stub.calledOnce, "Called update dependencies");
            assert.equal(removed.length, 3, "Removed all the items");
            return assert.equal(wrapped().length, 2, "Items left over");
        });

        it("Remove all takes out all requested items", function() {
            let wrapped = sandbox.qd.observableArray([1, 2, 2, 2, 3]);
            let stub = sinon.stub(sandbox.qd._.observables, "updateDependencies");
            let removed = wrapped.removeAll([2, 3]);

            assert.isTrue(stub.calledOnce, "Called update dependencies");
            assert.equal(removed.length, 4, "Removed all requested items");
            assert.equal(wrapped().length, 1, "Left only one");
            return assert.equal(wrapped()[0], 1, "Only number 1 is left");
        });

        return it("Remove all items if nothing passed to removeAll", function() {
            let wrapped = sandbox.qd.observableArray([1, 2, 2, 2, 3]);
            let stub = sinon.stub(sandbox.qd._.observables, "updateDependencies");
            let removed = wrapped.removeAll();

            assert.isTrue(stub.calledOnce, "Called update dependencies");
            assert.equal(removed.length, 5, "Removed all");
            return assert.equal(wrapped().length, 0, "Nothing left");
        });
    });

    describe("computed():", function() {
        it("Return value of function given is properly returned", function() {
            let computed = sandbox.qd.computed(() => 3
            , this, [sandbox.qd.observable()]);

            return assert.equal(computed(), 3, "Value should still be returned");
        });

        it("Parameters computed called with are handed to internal function", function() {
            let stub = sinon.stub();
            let computed = sandbox.qd.computed(stub, this, [sandbox.qd.observable()]);
            computed(1, 2, 3, 4);

            assert.isTrue(stub.calledOnce, "Called the internal function");
            return assert.equal(stub.getCall(0).args.length, 4, "All arguments passed through");
        });

        it("This object is properly bound for internal function", function() {
            let that = {
                something : true
            };
            let computed = sandbox.qd.computed(function() {
                return assert.isTrue(this.something, "This value properly bound");
            }
            , that, [sandbox.qd.observable()]);

            return computed();
        });

        return describe("Throws an error:", function() {
            let computedCallback = function() {};
            let that = {
                something : true
            };

            it("with no thisBinding", () => assert.throws(() => sandbox.qd.computed(computedCallback, null, [sandbox.qd.observable()])));

            it("with no observables", () => assert.throws(() => sandbox.qd.computed(computedCallback, that, [])));

            return it("with invalid observables", () => assert.throws(() => sandbox.qd.computed(computedCallback, that, [null])));
        });

    });

    return describe("unwrapObservable(possible)", function() {
        it("Non observable, non function value directly returned", function() {
            let value = "cats";
            return assert.equal(sandbox.qd.unwrapObservable(value), value, "Value returned");
        });

        it("Non observable function directly returned", function() {
            let value = () => false;
            return assert.equal(sandbox.qd.unwrapObservable(value), value, "Value returned");
        });

        it("Observable value unwrapped and returned", function() {
            let value = sandbox.qd.observable("cats");
            return assert.equal(sandbox.qd.unwrapObservable(value), "cats", "Value unwrapped");
        });

        it("Recursive observables not unwrapped by default", function() {
            let thisObs = sandbox.qd.observable('that');
            let value = sandbox.qd.observable({
                this : thisObs
            });
            return assert.equal(sandbox.qd.unwrapObservable(value).this, thisObs, "Should not unwrap recursive property");
        });

        it("Recursive unwrap of null wrapped observable is still null", function() {
            let value = sandbox.qd.observable(null);
            return assert.isNull(sandbox.qd.unwrapObservable(value, true), 'Wrapped nulls should remain null');
        });

        return it("Recursive observables all unwrapped and returned", function() {
            let value = sandbox.qd.observable({
                this : sandbox.qd.observable('that'),
                other : sandbox.qd.observable(2),
                thing : 4,
                nest : sandbox.qd.observable({
                    foo : sandbox.qd.observable('bar')
                })
            });
            let unwrapped = sandbox.qd.unwrapObservable(value, true);
            assert.equal(unwrapped.this, 'that', "This should point to that");
            assert.equal(unwrapped.other, 2, "Other should be two");
            assert.equal(unwrapped.thing, 4, "Thing should be 4");
            return assert.equal(unwrapped.nest.foo, 'bar', "Nested unwrapping works");
        });
    });
});

describe("Quickdraw.Internal.Observables", function() {
    describe("addDependency(model, element)", function() {
        it("Element given is tied to model given", function() {
            let model = {
                label : sandbox.qd.observable("cats")
            };
            let element = sandbox.document.createElement("div");
            sandbox.qd._.observables.addDependency.call(model.label, model, element);
            return assert.equal(sandbox.qd._.storage.getInternalValue(element, sandbox.qd.getConfig('baseModelKey')), model, "Model correctly tied to element");
        });

        it("Element given is made a dependency of observable", function() {
            let model = {
                label : sandbox.qd.observable("cats")
            };
            let element = sandbox.document.createElement("div");
            sandbox.qd._.observables.addDependency.call(model.label, model, element);

            let dependencies = sandbox.qd._.observables.getDependencies.call(model.label);

            assert.equal(dependencies.length, 1, "Dependency is added when new");
            return assert.equal(dependencies[0].domNode, element, "Element was added as dependency");
        });

        it("Element given is not made a dependency if already a dependency", function() {
            let model = {
                label : sandbox.qd.observable("cats")
            };
            let element = sandbox.document.createElement("div");
            sandbox.qd._.observables.addDependency.call(model.label, model, element);
            sandbox.qd._.observables.addDependency.call(model.label, model, element);

            assert.equal(model.label.__dependencies.length, 1, "Dependency is added when new");
            return assert.equal(model.label.__dependencies[0].domNode, element, "Element was added as dependency");
        });

        return it("Null model or element causes dependencies to remain unchanged", function() {
            let obv = sandbox.qd.observable("cats");
            sandbox.qd._.observables.addDependency.call(obv, null, null);

            return assert.isUndefined(obv.__dependencies, "Dependencies not setup");
        });
    });

    describe("getDependencies()", function() {
        it("Dependency array is directly returned if exists", function() {
            let obv = sandbox.qd.observable("cats");
            obv.__dependencies = [1, 2, 3];

            return assert.equal(sandbox.qd._.observables.getDependencies.call(obv), obv.__dependencies, "Array directly returned");
        });

        it("If no dependencies, empty array is returned", function() {
            let obv = sandbox.qd.observable("cats");
            return assert.equal(sandbox.qd._.observables.getDependencies.call(obv).length, 0, "Empty array for no set dependency");
        });

        it("Dependencies from all computeds are returned", function() {
            let obv = sandbox.qd.observable("cat");
            let computed1 = sandbox.qd.computed((function() {}), this, [obv]);
            let computed2 = sandbox.qd.computed((function() {}), this, [obv]);
            computed1.__dependencies = [1, 2, 3, 4];
            computed2.__dependencies = [5, 6, 7, 8];

            let dependents = sandbox.qd._.observables.getDependencies.call(obv);

            return assert.equal(dependents.length, 8, "All computed dependencies returned");
        });

        return it("If no dependences, empty array is returned", function() {
            let obv = sandbox.qd.observable("cats");
            return assert.equal(sandbox.qd._.observables.getDependencies.call(obv).length, 0, "Empty array for no dependencies");
        });
    });

    describe("addComputedDependency(computed)", () =>
        it("Computed is added to observable", function() {
            let obv = sandbox.qd.observable("cat");
            let computed = sandbox.qd.computed((function() {}), this, [obv]);

            assert.equal(obv.__computedDependencies.length, 1, "Dependency was added");
            return assert.equal(obv.__computedDependencies[0], computed, "Computed is the first item");
        })
    );

    return describe("updateDependencies()", function() {
        it("Non-immediate update enqueues all dependencies and sets timeout", function() {
            let fakeDepend = [{
                domNode : {
                    _qdData : {
                        _ : {
                            handlers : {}
                        }
                    }
                },
                handlers : []
            }, {
                domNode : {
                    _qdData : {
                        _ : {
                            handlers : {}
                        }
                    }
                },
                handlers : []
            }, {
                domNode : {
                    _qdData : {
                        _ : {
                            handlers : {}
                        }
                    }
                },
                handlers : []
            }];
            let obv = sandbox.qd.observable(false);
            let getSpy = sinon.stub(sandbox.qd._.observables, "getDependencies", () => fakeDepend);
            let enqueueSpy = sinon.spy(sandbox.qd._.updates, "enqueue");
            let scheduleSpy = sinon.stub(sandbox.qd._.updates, "schedule");

            sandbox.qd._.observables.updateDependencies.call(obv);

            assert.equal(enqueueSpy.callCount, 3, "Should have enqueued three dependencies");
            return assert.isTrue(scheduleSpy.called, "Should have enqueued dependencies to update");
        });

        return it("Immediate update calles update node set directly", function() {
            let fakeDepend = [{
                domNode : {
                    _qdData : {
                        _ : {
                            handlers : {}
                        }
                    }
                },
                handlers : []
            }, {
                domNode : {
                    _qdData : {
                        _ : {
                            handlers : {}
                        }
                    }
                },
                handlers : []
            }, {
                domNode : {
                    _qdData : {
                        _ : {
                            handlers : {}
                        }
                    }
                },
                handlers : []
            }];
            let obv = sandbox.qd.observable(false);
            let getSpy = sinon.stub(sandbox.qd._.observables, "getDependencies", () => fakeDepend);
            let enqueueSpy = sinon.spy(sandbox.qd._.updates, "enqueue");
            let updateSpy = sinon.stub(sandbox.qd._.updates, "updateNodeSet");

            sandbox.qd._.observables.updateDependencies.call(obv, true);

            assert.isFalse(enqueueSpy.called, "Should not enqueue anything as this update is immediate");
            assert.isTrue(updateSpy.called, "Should have called update node set");
            return assert.deepEqual(updateSpy.firstCall.args[0], [fakeDepend[0].domNode, fakeDepend[1].domNode, fakeDepend[2].domNode], "Should have called update with depenedencies");
        });
    });
});

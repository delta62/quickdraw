/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Internal.Binding", function() {
    describe("getBindingFunction(node):", function() {
        it("Given a null node, nothing is done and null is returned", function() {
            let result = sandbox.qd._.binding.getBindingFunction(null);
            return assert.isNull(result, "Null is returned for null input");
        });

        it("Given a node that has no getAttribute, returns null", function() {
            let comment = sandbox.document.createComment("test");
            let result = sandbox.qd._.binding.getBindingFunction(comment);
            return assert.isNull(result, "Null is returned for non-node input");
        });

        it("Given a node that has no binding, null returned", function() {
            let node = sandbox.document.createElement("div");
            let spy = sinon.spy(node, "getAttribute");
            let result = sandbox.qd._.binding.getBindingFunction(node);
            assert.isNull(result, "Null returned when no data-bind attribute specified");
            return assert.isTrue(spy.calledOnce, "getAttribute was called");
        });

        it("If a node binding attribute throws an error on parse because of syntax", function() {
            let node = sandbox.document.createElement("div");
            node.setAttribute(sandbox.qd.getConfig('bindingAttribute'), '{ this fails }');
            let spy = (sandbox.qd._.errors.throw = sinon.spy());
            sandbox.qd._.binding.getBindingFunction(node);

            return assert.isTrue(spy.calledOnce, "Should have called the error method");
        });

        return it("Valid binding string parsed to function and returned", function() {
            let node = sandbox.document.createElement("div");
            node.setAttribute(sandbox.qd.getConfig('bindingAttribute'), 'data : first + second');
            let result = sandbox.qd._.binding.getBindingFunction(node);

            let parsedResult = result({
                first : 1,
                second : 2,
                $data : {}
            });

            return assert.equal(parsedResult.data, 3, "Should properly parse with the context");
        });
    });

    describe("getEvaluatedBindingObject(domNode, bindingContext)", function() {
        it("returns null if there is no binding function", function() {
            let functionSpy = sinon.stub(sandbox.qd._.binding, "getBindingFunction", () => null);

            return assert.isNull(sandbox.qd._.binding.getEvaluatedBindingObject({}, {}), "Should return null since there is no binding function");
        });

        it("Catches any errors thrown in the binding function", function() {
            let bindingContext = {};
            let rawNode = sandbox.document.createElement('div');
            let virtualNode = sandbox.qd._.dom.virtualize(rawNode);

            let functionSpy = sinon.stub(sandbox.qd._.binding, "getBindingFunction", () =>
                function(context, node) {
                    assert.equal(context, bindingContext, "Binding context should be the first thing passed to the binding function");
                    assert.equal(node, rawNode, "Should pass the unvirtualized node to the binding function");
                    throw "Things are not what they seem";
                }
            );

            let errorSpy = (sandbox.qd._.errors.throw = sinon.spy());

            assert.isNull(sandbox.qd._.binding.getEvaluatedBindingObject(virtualNode, bindingContext), "Should return null if an error is thrown");

            return assert.isTrue(errorSpy.called, "Should have thrown an error through quickdraw error class");
        });

        return it("Correctly returns evaluated binding object if all goes well", function() {
            let fakeBindingObject = {};

            let functionSpy = sinon.stub(sandbox.qd._.binding, "getBindingFunction", () => () => fakeBindingObject);

            return assert.equal(sandbox.qd._.binding.getEvaluatedBindingObject({}, {}), fakeBindingObject, "Should correctly return binding object");
        });
    });

    describe("bindModel(viewModel, domRoot, context)", function() {
        it("Errors on invalid viewmodel", function() {
            let errorSpy = sinon.stub(sandbox.qd._.errors, "throw");
            sandbox.qd._.binding.bindModel(null);

            return assert.isTrue(errorSpy.calledOnce, "Should have thrown an error via quickdraw about missing view model");
        });

        it("Throws an error for undefined binding context", function() {
            let errorSpy = sinon.stub(sandbox.qd._.errors, "throw");
            sandbox.qd._.binding.bindModel({}, {});

            return assert.isTrue(errorSpy.calledOnce, "Should have thrown an error via quickdraw about missing binding context");
        });

        it("Throws an error when view model is not properly wrapped", function() {
            let errorSpy = sinon.stub(sandbox.qd._.errors, "throw");
            sandbox.qd._.binding.bindModel({}, {}, {});

            return assert.isTrue(errorSpy.calledOnce, "Should have thrown an error via quickdraw about incorrect view model");
        });

        it("Correctly updates the quickdraw state to reflect the new viewmodel", function() {
            let vm = sandbox.qd._.models.create({});
            let node = {};
            let context = {};

            sandbox.qd._.dom.virtualize = dom => dom;
            sandbox.qd._.binding.bindDomTree = function() {};
            let modelSpy = (sandbox.qd._.models.setParent = sinon.spy());
            let restoreSpy = sinon.stub();
            let updateState = sinon.spy(sandbox.qd._, "updateCurrentState");

            sandbox.qd._.binding.bindModel(vm, node, context);

            assert.isTrue(modelSpy.calledWith(vm, null), "Should have called set parent for new model");
            assert.isTrue(updateState.calledOnce, "Should have called update state");
            assert.equal(updateState.getCall(0).args[0].model, vm, "Should have updated the current view model in the state");
            return assert.isNull(sandbox.qd._.state.current.model, "Should have restored the previous view model after binding");
        });

        it("Always virtualizes the given dom node", function() {
            let vm = sandbox.qd._.models.create({});
            let node = {};
            let context = {};

            let virtualSpy = (sandbox.qd._.dom.virtualize = sinon.spy(dom => 1));
            let bindSpy = (sandbox.qd._.binding.bindDomTree = sinon.stub());
            sandbox.qd._.models.setParent = function() {};

            sandbox.qd._.binding.bindModel(vm, node, context);
            assert.isTrue(virtualSpy.calledWith(node), "Should have tried to virtualize the given dom node");
            return assert.isTrue(bindSpy.calledWith(1, context), "Should have passed virtual dom node through");
        });

        return it("Errors when view model has changed during binding", function() {
            let vm = sandbox.qd._.models.create({});
            let node = {};
            let context = {};
            let errorSpy = sinon.stub(sandbox.qd._.errors, "throw");

            sandbox.qd._.models.setParent = function() {};
            sandbox.qd._.binding.bindDomTree = () => sandbox.qd._.state.current.model = "fake";

            sandbox.qd._.binding.bindModel(vm, node, context);
            return assert.isTrue(errorSpy.calledOnce, "Should have thrown an error via quickdraw");
        });
    });

    describe("bindDomTree(domRoot, bindingContext):", function() {
        it("Does not recurse to children if sub call returns false", function() {
            let domNode = {
                getChildren : sinon.spy()
            };
            let bindNodeSpy = sinon.stub(sandbox.qd._.binding, "bindDomNode", () => false);

            sandbox.qd._.binding.bindDomTree(domNode, {});

            assert.isTrue(bindNodeSpy.called, "Should call dom node binding method");
            return assert.isFalse(domNode.getChildren.called, "Should not call get children since dom node binding returned false");
        });

        return it("Does recurse to children if sub call returns true", function() {
            let fakeChildren = [{}, {}];
            let domNode = {
                getChildren : sinon.spy(() => fakeChildren)
            };
            let bindNodeSpy = sinon.stub(sandbox.qd._.binding, "bindDomNode", () => true);

            let originalBindTree = sandbox.qd._.binding.bindDomTree;
            let bindTreeSpy = sinon.stub(sandbox.qd._.binding, "bindDomTree");

            originalBindTree.call(sandbox.qd._.binding, domNode, {});

            assert.isTrue(bindNodeSpy.called, "Should call dom node binding method");
            assert.isTrue(domNode.getChildren.called, "Should call get children since dom node binding returned true");
            return assert.equal(bindTreeSpy.callCount, fakeChildren.length, "Should hve called bind dom tree for each child");
        });
    });

    describe("bindDomNode(domNode, bindingContext)", function() {
        it("Does no binding if there is no binding object", function() {
            let node = sandbox.document.createElement('div');
            let virtualNode = sandbox.qd._.dom.virtualize(node);

            let storageSpy = sinon.stub(sandbox.qd._.storage, "setInternalValue");
            let functionSpy = sinon.stub(sandbox.qd._.binding, "getEvaluatedBindingObject", () => null);

            assert.isTrue(sandbox.qd._.binding.bindDomNode(virtualNode, {}), "When no binding function bindDomNode should return true");
            return assert.isFalse(storageSpy.called, "Should not have called storage spy since there was no binding object");
        });

        return it("Marks node with all handlers in the binding function and starts them as dirty", function() {
            let fakeNode = {};
            let fakeContext = {};
            let fakeBindingObject = {
                first : "yes",
                second : "no"
            };

            sandbox.qd._.binding.getEvaluatedBindingObject = () => fakeBindingObject;
            sandbox.qd._.state.binding.order = ["first", "second"];
            let initializeSpy = sinon.stub(sandbox.qd._.handlers, "getInitialize");
            let updateSpy = sinon.stub(sandbox.qd._.binding, "updateDomNode", () => true);
            let storageSpy = sinon.stub(sandbox.qd._.storage, "setInternalValue", () => assert.isFalse(updateSpy.called, "Should not call update spy before setting internal value"));

            sandbox.qd._.binding.bindDomNode(fakeNode, fakeContext);

            assert.isTrue(initializeSpy.calledWith("first"), "Should have requested the first handler at some point");
            assert.isTrue(initializeSpy.calledWith("second"), "Should have requested the second handler at some point");
            assert.isTrue(storageSpy.calledOnce, "Should set handlers on internal storage");
            assert.equal(storageSpy.firstCall.args.length, 3, "Should have passed three arguments to storage");
            assert.equal(storageSpy.firstCall.args[0], fakeNode, "Should store handlers on node");
            assert.equal(storageSpy.firstCall.args[1], 'handlers', "Should store under the key handlers");
            let handlerObject = storageSpy.firstCall.args[2];
            assert.isTrue(handlerObject.first, "Should have marked the first handler as dirty");
            assert.isTrue(handlerObject.second, "Should have marked the second handler as dirty");
            return assert.isTrue(updateSpy.calledWith(fakeNode, fakeContext, fakeBindingObject), "Should call update dom node after setting handlers object");
        });
    });

    describe("updateDomNode(domNode, bindingContext, bindingObject = null)", function() {
        it("Does no binding if there is no binding object", function() {
            let domNode = {};
            let storageSpy = sinon.stub(sandbox.qd._.storage, "getInternalValue");
            let functionSpy = sinon.stub(sandbox.qd._.binding, "getEvaluatedBindingObject", () => null);

            assert.isTrue(sandbox.qd._.binding.updateDomNode(domNode, {}), "Should allow to continue to children when no binding function");
            assert.isTrue(functionSpy.called, "Should call to get binding object");
            return assert.isFalse(storageSpy.called, "Should not have called the storage module as it should have returned early");
        });

        it("Evaluates binding object only if not given one", function() {
            let domNode = {};
            let bindingContext = {};
            let bindingSpy = sinon.stub(sandbox.qd._.binding, "getEvaluatedBindingObject", () => null);

            sandbox.qd._.binding.updateDomNode(domNode, bindingContext);
            assert.isTrue(bindingSpy.calledWith(domNode, bindingContext), "Should have called binding object evaluater since no object was given");

            bindingSpy.reset();

            sandbox.qd._.state.binding.order = [];
            sandbox.qd._.binding.updateDomNode(domNode, bindingContext, {});
            return assert.isFalse(bindingSpy.called, "Should not have called binding function since object was given");
        });

        it("Calls any handlers that are marked to receive updates", function() {
            let domNode = {};
            let handlerState = {
                first : true,
                second : false,
                third : true
            };
            sandbox.qd._.storage.setInternalValue(domNode, 'handlers', handlerState);
            sandbox.qd._.state.binding.order = ["first", "second", "third", "fourth"];
            let updateSpy = sinon.stub(sandbox.qd._.handlers, "getUpdate", () => function() {});

            let result = sandbox.qd._.binding.updateDomNode(domNode, {}, {
                first : 1,
                second : 2,
                third : 3
            });

            assert.isTrue(result, "Since no handlers returned a value, should continue should be true");

            assert.isTrue(updateSpy.calledWith('first'), "Should have gotten the first update method at some point");
            assert.isTrue(updateSpy.calledWith('third'), "Should have gotten the third update method at some point");
            assert.isFalse(handlerState.first, "Should set the dirty state to false for first handler");
            return assert.isFalse(handlerState.third, "Should set the dirty state to false for third handler");
        });

        return it("If an update is false the result of the function call is false", function() {
            let domNode = {};
            sandbox.qd._.storage.setInternalValue(domNode, 'handlers', { first : true });
            sandbox.qd._.state.binding.order = ["first"];
            sandbox.qd._.handlers.getUpdate = () => () => false;

            return assert.isFalse(sandbox.qd._.binding.updateDomNode(domNode, {}, { first : 2 }), "Should result in false since an update method returned false");
        });
    });

    return describe("unbindDomTree(domNode)", function() {
        it("calls remove dependency on any observables registered on node", function() {
            let node = sandbox.document.createElement('div');
            let removeSpy = sinon.spy();
            sandbox.qd._.observables.removeDependency = removeSpy;
            sandbox.qd._.storage.setInternalValue(node, 'observables', [{}, {}]);

            sandbox.qd._.binding.unbindDomTree(node);

            return assert.isTrue(removeSpy.calledTwice, "Should call remove dependency for each observable");
        });

        it("calls clear storage for quickdraw storage", function() {
            let node = sandbox.document.createElement('div');
            let virtualNode = sandbox.qd._.dom.virtualize(node);
            let clearSpy = sinon.spy(virtualNode, 'clearValues');

            sandbox.qd._.binding.unbindDomTree(node);

            return assert.isTrue(clearSpy.called, "Should have cleared all values via virtual node");
        });

        it("should call unbind on all children", function() {
            let child, i;
            let node = sandbox.document.createElement('div');
            let children = [];
            for (i = 0; i < 4; i++) {
                child = sandbox.document.createElement('span');
                node.appendChild(child);
                children.push(child);
            }

            let callSpy = (sandbox.qd._.binding.unbindDomTree = sinon.spy(sandbox.qd._.binding.unbindDomTree));

            sandbox.qd._.binding.unbindDomTree(node);

            assert.equal(callSpy.callCount, 5, "Should be called once for node and once for each child");
            return (() => {
                let result = [];
                for (i = 0; i < children.length; i++) {
                    child = children[i];
                    result.push(assert.equal(callSpy.getCall(i + 1).args[0].getRawNode(), child, "Should call in child order"));
                }
                return result;
            })();
        });

        return it("calls cleanup method for any handler that needs it", function() {
            let handlers = {
                one : true,
                two : true,
                three : true
            };
            let node = sandbox.document.createElement('div');
            sandbox.qd._.storage.setInternalValue(node, 'handlers', handlers);

            let firstCleanSpy = sinon.spy();
            let thirdCleanSpy = sinon.spy();
            sandbox.qd.registerBindingHandler("one", {
                initialize : {},
                cleanup : firstCleanSpy
            });
            sandbox.qd.registerBindingHandler("two", {
                initialize : {}
            });
            sandbox.qd.registerBindingHandler("three", {
                initialize : {},
                cleanup : thirdCleanSpy
            });

            let getCleanupSpy = sinon.spy(sandbox.qd._.handlers, 'getCleanup');

            sandbox.qd._.binding.unbindDomTree(node);

            assert.equal(getCleanupSpy.callCount, 3, "Should have got three calls for cleanup handlers");
            for (let name in handlers) {
                let bool = handlers[name];
                assert.isTrue(getCleanupSpy.calledWith(name), `Should have asked for '${name}' cleanup handler`);
            }

            assert.isTrue(firstCleanSpy.calledWith(sandbox.qd._.dom.virtualize(node)), "Should have called first handler cleanup method");
            return assert.isTrue(thirdCleanSpy.calledWith(sandbox.qd._.dom.virtualize(node)), "Should have called third handler cleanup method");
        });
    });
});

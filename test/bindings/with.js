/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Bindings.With", function() {
    it("Handler is bound to with keyword", assertModuleBound("with"));

    it("Binding context appropriately extended", function() {
        let dom = createVirtualElement();
        dom.appendChild(sandbox.document.createElement("span"));
        let model = sandbox.qd._.models.create({
            submodel : { everything : true }
        });

        let initialize = qdGetInitialize("with");
        initialize(model.raw.submodel, dom);

        assert.equal(dom.getChildren().length, 0, "Should have no children after intialize");

        let stub = sinon.stub(sandbox.qd._.binding, "bindModel");
        let callback = qdGetUpdate("with");
        callback(model.raw.submodel, dom, sandbox.qd._.context.create(model));

        assert.equal(dom.getChildren().length, 1, "Should have child after update");
        assert.isTrue(stub.calledOnce, "Apply bindings correctly called");
        let context = stub.getCall(0).args[2];
        assert.equal(context.$data, model.raw.submodel, "Context modified to use submodel");
        assert.equal(context.$root, model.raw, "Original model still the root");
        assert.equal(context.$parents.length, 1, "Only one parent");
        assert.equal(context.$parent, model.raw, "Parent model properly tied");
        return assert.equal(context.$rawData, model.raw.submodel, "Raw data updated properly");
    });

    it("Non bindable children skipped", function() {
        let dom = createVirtualElement();
        let element = sandbox.document.createElement("span");
        dom.appendChild(element);
        dom.appendChild(sandbox.document.createComment("test"));
        let model = sandbox.qd._.models.create({});

        let stub = sinon.stub(sandbox.qd._.binding, "bindModel");
        let callback = qdGetUpdate("with");
        callback({}, dom, sandbox.qd._.context.create(model));
        
        assert.isTrue(stub.calledOnce, "Apply bindings only called once for non comment");
        return assert.equal(stub.getCall(0).args[1].getRawNode(), element, "Non comment node passed");
    });

    it("If data doesn't change on update rebind does not occur", function() {
        let bindingData = {};
        let model = sandbox.qd._.models.create({});
        let context = sandbox.qd._.context.create(model);
        let dom = createVirtualElement();
        let element = sandbox.document.createElement("span");
        dom.appendChild(element);

        let stub = sinon.stub(sandbox.qd._.binding, "bindModel");
        let initialize = qdGetInitialize("with");
        initialize(bindingData, dom);
        let update = qdGetUpdate("with");
        update(bindingData, dom, context);

        assert.isTrue(stub.calledOnce, "Should have applied bindings to element");

        stub.reset();
        update(bindingData, dom, context);
        return assert.isFalse(stub.called, "Should not have called stub as binding data did not change");
    });

    it("Null binding data results in children being removed", function() {
        let dom = createVirtualElement();
        dom.appendChild(sandbox.document.createElement("span"));
        dom.appendChild(sandbox.document.createElement("div"));

        let initialize = qdGetInitialize("with");
        initialize({}, dom);

        assert.equal(dom.getChildren().length, 0, "Should have no children after initialize");

        let callback = qdGetUpdate("with");
        callback({}, dom, sandbox.qd._.context.create({}));

        assert.equal(dom.getChildren().length, 2, "Should have children after update");

        let clearSpy = sinon.spy(dom, 'clearChildren');
        callback(null, dom, null);

        assert.isTrue(clearSpy.called, "Should have cleared the children as data has changed");
        return assert.equal(dom.getChildren().length, 0, "Should have no children after update to null");
    });

    it("If data has changed but template has not children are not cleared", function() {
        let dom = createVirtualElement();
        dom.appendChild(sandbox.document.createElement("span"));
        dom.appendChild(sandbox.document.createElement("div"));

        let myData = {};
        let myData2 = {};

        let initialize = qdGetInitialize("with");
        initialize(myData, dom);

        let callback = qdGetUpdate("with");
        callback(myData, dom, sandbox.qd._.context.create(myData));

        assert.equal(dom.getChildren().length, 2, "Should have no children after update");

        let clearSpy = sinon.spy(dom, 'clearChildren');
        callback(myData2, dom, sandbox.qd._.context.create(myData2));

        assert.isFalse(clearSpy.called, "Should not have called clear children as template did not change");
        return assert.equal(dom.getChildren().length, 2, "Should still have two children after update");
    });

    it("Original template returned on cleanup", function() {
        let dom = createVirtualElement();
        dom.appendChild(sandbox.document.createElement("span"));
        let model = sandbox.qd._.models.create({});

        let initialize = qdGetInitialize("with");
        initialize({}, dom);

        assert.equal(dom.getChildren().length, 0, "Should have no children after init");

        let cleanup = qdGetCleanup("with");
        cleanup(dom);

        return assert.equal(dom.getChildren().length, 1, "Should have added child back after cleanup");
    });

    return it("Using custom template is respected", function() {
        let dom = createVirtualElement();
        dom.appendChild(sandbox.document.createElement("span"));
        let realModel = {
            template : 'fakeTemplate'
        };
        let model = sandbox.qd._.models.create({
            model : realModel,
            templateFromModel : true
        });
        let bindSpy = sinon.stub(sandbox.qd._.binding, 'bindModel');

        let template = [sandbox.document.createElement("div")];
        sandbox.qd.registerTemplate('fakeTemplate', template);

        let initialize = qdGetInitialize("with");
        initialize(model.raw, dom);

        assert.equal(dom.getChildren().length, 0, "Should have no children after init");

        let callback = qdGetUpdate("with");
        callback(model.raw, dom, sandbox.qd._.context.create(model));

        assert.equal(dom.getChildren().length, 1, "Should have one child after update");
        assert.equal(dom.getChildren()[0].getProperty('nodeName'), "DIV", "Should have a div child");
        return assert.equal(bindSpy.firstCall.args[0].raw, realModel, "Should have called with sub model");
    });
});
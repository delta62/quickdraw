/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Bindings.Foreach", function() {
    it("Handler is bound to foreach keyword", assertModuleBound("foreach"));

    let createElement = function() {
        let dom = sandbox.document.createElement("div");
        let template = sandbox.document.createElement("span");
        dom.appendChild(template);
        return sandbox.qd._.dom.virtualize(dom);
    };

    let createContext = function(data) {
        let model = sandbox.qd._.models.create(data);
        return sandbox.qd._.context.create(model);
    };

    let initializeElement = function(data, dom, context) {
        let initialize = qdGetInitialize("foreach");
        initialize(data, dom, context);
        return updateElement(data, dom, context);
    };

    var updateElement = function(data, dom, context) {
        let update = qdGetUpdate("foreach");
        return update(data, dom, context);
    };

    describe("Single Overall Template", function() {
        it("Creates an element for each element in an array", function() {
            let items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            let dom = createElement();

            let stub = sinon.stub(sandbox.qd._.binding, "bindModel");

            initializeElement(items, dom, createContext(items));

            assert.equal(stub.callCount, items.length, "Each new element has bindings applied");

            let newChildren = dom.getChildren();
            assert.equal(newChildren.length, items.length, "Each new element was added to page");
            return (() => {
                let result = [];
                for (let i = 0, end = items.length, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
                    assert.equal(stub.getCall(i).args[0].raw, items[i], "Items called in the order specified");
                    result.push(assert.equal(stub.getCall(i).args[1], newChildren[i], "Item added to parent in correct order"));
                }
                return result;
            })();
        });

        it("Binding context modified correctly", function() {
            let items = [1];
            let dom = createElement();

            let stub = sinon.stub(sandbox.qd._.binding, "bindModel");

            initializeElement(items, dom, createContext(items));

            assert.isTrue(stub.calledOnce, "Apply bindings correctly called");
            let callData = stub.getCall(0);
            assert.equal(callData.args[2].$index(), 0, "Index correctly passed");
            return assert.equal(callData.args[2].$data, items[0], "Data updated");
        });

        it("Manually changing elements does not prevent template from being used on next apply", function() {
            let items = [1, 2, 3, 4, 5];
            let dom = createElement();
            let stub = sinon.stub(sandbox.qd._.binding, "bindModel");

            initializeElement(items, dom, createContext(items));

            assert.equal(stub.callCount, items.length, "Each new element has bindings applied");

            dom.clearChildren();

            let newElm = sandbox.document.createElement("a");
            newElm = dom.appendChild(newElm);

            items = [6, 7, 8, 9, 10];
            stub.reset();

            updateElement(items, dom, createContext(items));

            let newChildren = dom.getChildren();
            assert.equal(stub.callCount, items.length, "Each item again bound");
            assert.isFalse(__in__(newElm, newChildren), "Added item is removed");

            return (() => {
                let result = [];
                for (let i = 0, end = items.length, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
                    assert.equal(stub.getCall(i).args[0].raw, items[i], "Items called in the order given");
                    assert.equal(stub.getCall(i).args[1], newChildren[i], "Item added to parent in order");
                    result.push(assert.equal(newChildren[i].getProperty('nodeName').toLowerCase(), "span", "Item is proper template"));
                }
                return result;
            })();
        });

        it("Elements that remain unchanged are not rebound", function() {
            let items = [1, 2, 3, 4];
            let dom = createElement();
            let stub = sinon.stub(sandbox.qd._.binding, "bindModel");

            initializeElement(items, dom, createContext(items));

            assert.equal(stub.callCount, items.length, "Each new element has binding applied");

            items.push(5);
            stub.reset();
            updateElement(items, dom, createContext(items));
            assert.equal(stub.callCount, 1, "Only new item is bound");
            assert.equal(stub.getCall(0).args[0].raw, items[items.length - 1], "Last item is properly bound");
            return assert.equal(dom.getChildren()[items.length - 1].getProperty('nodeName').toLowerCase(), "span", "Item is proper template");
        });

        it("Elements that change indexes are not fully rebound", function() {
            let context;
            let items = [1, 2, 3, 4];
            let dom = createElement();
            let stub = sinon.stub(sandbox.qd._.binding, "bindModel");

            initializeElement(items, dom, createContext(items));

            assert.equal(stub.callCount, items.length, "Should bind all four original items");

            let contexts = [];
            for (let child of dom.getChildren()) {
                context = child.getValue('context', 'foreach');
                context.$index = sinon.spy();
                contexts.push(context);
            }

            items.unshift(0);
            stub.reset();
            updateElement(items, dom, createContext(items));

            assert.equal(stub.callCount, 1, "Only one item is fully bound as the rest still exist");
            let boundElement = stub.getCall(0).args[1];

            for (let i = 0; i < contexts.length; i++) {
                context = contexts[i];
                assert.isTrue(context.$index.calledWith(i + 1), "Should have updated index in non-fully bound items");
            }

        });

        it("Elements are correctly reused without returning any templates", function() {
            let items = [1, 2, 3, 4];
            let dom = createElement();
            let stub = sinon.stub(sandbox.qd._.binding, "bindModel");

            initializeElement(items, dom, createContext(items));
            assert.equal(stub.callCount, items.length, "Each new element has binding applied");

            // store all the children currently there
            let children = dom.getChildren();

            items.push(5);
            stub.reset();
            let returnSpy = sinon.spy(sandbox.qd._.templates, "return");
            updateElement(items, dom, createContext(items));
            assert.equal(stub.callCount, 1, "Only new item is bound");
            assert.equal(stub.getCall(0).args[0].raw, items[items.length - 1], "Last item is properly bound");
            assert.isFalse(returnSpy.called, "Should not return any templates since they are directly reused");

            // ensure all the original nodes are the same ones in the tree
            let newChildren = dom.getChildren();
            return __range__(0, children.length, false).map((i) =>
                assert.equal(newChildren[i], children[i], `Child at index ${i} is properly reused`));
        });

        return it("Templates are reused with complete data replacement", function() {
            let child, i, model;
            let items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            let dom = createElement();
            let stub = sinon.stub(sandbox.qd._.binding, "bindModel");

            initializeElement(items, dom, createContext(items));
            let children = dom.getChildren();

            assert.equal(stub.callCount, items.length, "Each new element has bindings applied");
            for (i = 0; i < children.length; i++) {
                child = children[i];
                model = child.getValue('model', 'foreach');
                assert.equal(stub.getCall(i).args[1], child, `Should have bound ${i} child`);
                assert.equal(model, items[i], `Incorrect item bound for child ${i}`);
            }

            stub.reset();

            items = [11, 12, 13, 14, 15, 16, 17];
            updateElement(items, dom, createContext(items));
            let newChildren = dom.getChildren();

            assert.equal(stub.callCount, items.length, "Each new element has binding applied");
            for (i = 0; i < newChildren.length; i++) {
                child = newChildren[i];
                model = child.getValue('model', 'foreach');
                assert.equal(stub.getCall(i).args[1], child, `Should have bound ${i} child`);
                assert.equal(model, items[i], `Incorrect item bound for child ${i}`);
                assert.equal(child, children[i], `Should have completely reused child at position ${i}`);
            }

        });
    });

    describe("Multiple Templates", function() {
        let registerCustomTemplate = function(templateName) {
            let nodes = [];
            nodes.push(sandbox.document.createElement('div'));
            nodes.push(sandbox.document.createElement('div'));
            return sandbox.qd.registerTemplate(templateName, nodes);
        };

        it("If template is specified in model it is used instead of main template", function() {
            let templateName = "otherTemplate";
            let items = [{template : templateName}, {template : templateName}];
            registerCustomTemplate(templateName);
            let dom = createElement();

            let getSpy = sinon.spy(sandbox.qd._.templates, "get");

            initializeElement({ data : items, templatesFromModels : true }, dom, createContext(items));
            let children = dom.getChildren();
            assert.equal(getSpy.callCount, items.length, "Should have requested two templates");
            assert.isTrue(getSpy.calledWith("otherTemplate"), "Should have requested manual template once");
            return assert.equal(children.length, 4, "Should have 4 child elements");
        });

        return it("cleanup correctly returns each template type", function() {
            let templateName = "otherTemplate";
            let items = [{template : templateName}, {template : templateName}];
            registerCustomTemplate(templateName);
            let dom = createElement();

            let returnSpy = sinon.spy(sandbox.qd._.templates, "return");

            initializeElement({ data : items, templatesFromModels : true }, dom, createContext(items));
            let children = dom.getChildren();
            assert.equal(children.length, 4, "Should have 4 child elements");

            let cleanup = qdGetCleanup("foreach");
            cleanup(dom);

            let registeredName = sandbox.qd._.templates.resolve(templateName);

            assert.equal(returnSpy.callCount, 2, "Should have returned two templates");
            assert.equal(returnSpy.getCall(0).args[0], registeredName, "Should have returned custom template");
            return assert.equal(returnSpy.getCall(1).args[0], registeredName, "Should have returned custom template");
        });
    });

    return describe("Cleanup", () =>
        it("Cleanup properly restores original template", function() {
            let items = [1, 2, 3, 4];
            let dom = createElement();
            let template = dom.getChildren()[0].getProperty('outerHTML');

            initializeElement(items, dom, createContext(items));
            assert.equal(dom.getChildren().length, 4, "Should have 4 child elements");

            // add extra child to ensure it cleans it up
            dom.appendChild(sandbox.qd._.dom.virtualize(sandbox.document.createElement('div')));

            let cleanup = qdGetCleanup("foreach");
            cleanup(dom);

            assert.equal(dom.getChildren().length, 1, "Should only have 1 child elements");
            return assert.equal(dom.getChildren()[0].getProperty('outerHTML'), template, "Should have restored the original template");
        })
    );
});

function __in__(needle, haystack) {
  return Array.from(haystack).indexOf(needle) >= 0;
}
function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}
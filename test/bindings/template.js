/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Binding.Template", function() {
    it("Handler is bound to template keyword", assertModuleBound('template'));

    it("Error thrown when template not registered with quickdraw", function() {
        sandbox.qd._.templates.exists = () => false;
        let errorSpy = sinon.stub(sandbox.qd._.errors, 'throw');

        let initialize = qdGetInitialize('template');
        initialize('fakeName', {}, {});

        return assert.isTrue(errorSpy.calledOnce, "Should have called error spy since template given doesn't exist");
    });

    it("template nodes correctly set as children", function() {
        let fakeNodes = [{}, {}, {}];
        sandbox.qd._.templates.exists = () => true;
        sandbox.qd._.templates.get = () => fakeNodes;

        let virtualNode = sandbox.qd._.dom.virtualize(sandbox.document.createElement('div'));

        let initialize = qdGetInitialize('template');
        let result = initialize('fakeName', virtualNode, {});

        let children = virtualNode.getChildren();
        assert.isTrue(result, "Should allow binding of children");
        assert.equal(children.length, fakeNodes.length, "Should have complete template as children");
        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            assert.equal(child.getRawNode(), fakeNodes[i], `Node at position ${i} in template should be ${i}th child`);
        }

        // no loop captures
    });

    return it("on unbind template is removed", function() {
        let fakeNodes = [{}, {}, {}];
        sandbox.qd._.binding.unbindDomTree = function() {};
        sandbox.qd._.templates.exists = () => true;
        sandbox.qd._.templates.get = () => fakeNodes;
        let returnSpy = (sandbox.qd._.templates.return = sinon.spy());

        let virtualNode = sandbox.qd._.dom.virtualize(sandbox.document.createElement('div'));

        let initialize = qdGetInitialize('template');
        initialize('fakeName', virtualNode, {});

        let cleanup = qdGetCleanup('template');
        cleanup(virtualNode);
        assert.equal(returnSpy.firstCall.args[0], 'fakeName', "Should have template named 'fakeName'");

        let children = virtualNode.getChildren();
        return assert.equal(children.length, 0, "Should have no children now");
    });
});
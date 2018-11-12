/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Bindings.Visible", function() {
    it("Handler is bound to visible keyword", assertModuleBound("visible"));

    it("Truth value uses default display", function() {
        let dom = createVirtualElement();
        dom.getRawNode().style.display = "inline-block";

        let callback = qdGetUpdate("visible");

        callback(true, dom);

        return assert.equal(dom.getStyle('display'), "", "Truth value sets display to default");
    });

    return it("False value hides element", function() {
        let dom = createVirtualElement();
        dom.getRawNode().style.display = "inline-block";

        let callback = qdGetUpdate("visible");

        callback(false, dom);

        return assert.equal(dom.getStyle('display'), "none", "False value sets display to none");
    });
});
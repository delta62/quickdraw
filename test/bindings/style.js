/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Bindings.Style", function() {
    it("Handler is bound to style keyword", assertModuleBound("style"));

    return it("Sets the appropriate styles on the element", function() {
        let dom = createVirtualElement('div');
        let callback = qdGetUpdate("style");
        callback({ color : "green", backgroundColor : "blue"}, dom);

        assert.equal(dom.getStyle('color'), "green", "Color property set");
        return assert.equal(dom.getStyle('backgroundColor'), "blue", "Background property set");
    });
});
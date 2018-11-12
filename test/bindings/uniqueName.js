/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Bindings.UniqueName", function() {
    it("Handler is bound to html keyword", assertModuleBound("uniqueName"));

    return it("Dom element given unique name", function() {
        let dom = createVirtualElement();

        let callback = qdGetInitialize("uniqueName");

        callback(true, dom);

        return assert.isNotNull(dom.getAttribute("name"), "HTML element should have a unique name now");
    });
});
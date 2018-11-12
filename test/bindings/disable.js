/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Bindings.Disable", function() {
    it("Handler is bound to disable keyword", assertModuleBound("disable"));

    it("Element is disabled when value is true", function() {
        let dom = createVirtualElement('input');

        let callback = qdGetUpdate("disable");

        callback(true, dom);

        return assert.isTrue(dom.getProperty('disabled'), "Dom is disabled");
    });

    return it("Element is enabled when value is false", function() {
        let dom = createVirtualElement('input');

        let callback = qdGetUpdate("disable");

        callback(false, dom);

        return assert.isFalse(dom.getProperty('disabled'), "Dom is enabled");
    });
});
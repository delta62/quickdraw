/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Bindings.Enable", function() {
    it("Handler is bound to enable keyword", assertModuleBound("enable"));

    it("Element is enabled when value is true", function() {
        let dom = createVirtualElement('input');

        let callback = qdGetUpdate("enable");

        callback(true, dom);

        return assert.isFalse(dom.getProperty('disabled'), "Dom is enabled");
    });

    return it("Element is disabled when value is false", function() {
        let dom = createVirtualElement('input');

        let callback = qdGetUpdate("enable");

        callback(false, dom);

        return assert.isTrue(dom.getProperty('disabled'), "Dom is disabled");
    });
});
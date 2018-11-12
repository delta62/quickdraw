/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Bindings.Html", function() {
    it("Handler is bound to html keyword", assertModuleBound("html"));

    it("HTML should be parsed and added", function() {
        let dom = createVirtualElement('div');

        let callback = qdGetUpdate("html");
        let setHTML = "<div>New Elements</div>";

        callback(setHTML, dom);

        return assert.equal(dom.getProperty('innerHTML'), setHTML, "HTML should be directly set");
    });

    return it("Old elements are cleared when html added", function() {
        let dom = createVirtualElement('div');
        dom.getRawNode().innerHTML = "<span>Old Elements are the best</span>";

        let callback = qdGetUpdate("html");
        let setHTML = "<div>New Elements</div>";

        callback(setHTML, dom);

        return assert.equal(dom.getProperty('innerHTML'), setHTML, "HTML should be updated to given");
    });
});

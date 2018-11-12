/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Bindings.Text", function() {
    it("Handler is bound to text keyword", assertModuleBound("text"));

    it("Text should be set to node text value", function() {
        let dom = createVirtualElement('div');

        let callback = qdGetUpdate("text");
        let setText = "Hello world!";

        callback(setText, dom);

        return assert.equal(dom.getProperty('textContent'), setText, "Text value should be updated");
    });

    it("All content should be cleared when text entered", function() {
        let dom = createVirtualElement('div');
        dom.getRawNode().innerHTML = "<div>im an inner div</div><div>so am i</div>";

        let callback = qdGetUpdate("text");
        let setText = "No more divs";

        callback(setText, dom);

        return assert.equal(dom.getProperty('textContent'), setText, "Text value should be updated");
    });

    return it("HTML content should be escaped and not parsed", function() {
        let dom = createVirtualElement('div');

        let callback = qdGetUpdate("text");
        let setText = "<div>Injection Attack</div>";
        callback(setText, dom);

        return assert.equal(dom.getProperty('textContent'), setText, "Content is unchanged");
    });
});
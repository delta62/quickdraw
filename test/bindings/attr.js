/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe('Quickdraw.Bindings.Attr', function() {
    it('Handler is bound to attr keyword', assertModuleBound('attr'));

    it('Sets a single attribute', function() {
        let dom = createVirtualElement('div');
        let callback = qdGetUpdate('attr');
        callback({ title : 'cats' }, dom);

        return assert.equal(dom.getAttribute('title'), 'cats', 'Attribute properly set');
    });

    it('Sets multiple attributes', function() {
        let dom = createVirtualElement('div');
        let callback = qdGetUpdate('attr');
        callback({
            title : 'cats',
            href : 'google.com'
        }, dom);

        assert.equal(dom.getAttribute('title'), 'cats', 'Attribute properly set');
        return assert.equal(dom.getAttribute('href'), 'google.com', 'Other property set');
    });

    it('If attribute is null, removed from ', function() {
        let dom = createVirtualElement('div');
        dom.setAttribute('cats', 'yes');
        let callback = qdGetUpdate('attr');
        callback({
            cats : null
        }, dom);

        return assert.isFalse(dom.hasAttribute('cats'), "Should not have cats attribute anymore");
    });

    return it('On cleanup any added attributes are removed', function() {
        let dom = createVirtualElement('div');
        dom.setAttribute('cats', 'yes');
        let callback = qdGetUpdate('attr');
        callback({
            dogs : "yes"
        }, dom);

        let cleanup = qdGetCleanup('attr');
        cleanup(dom);

        assert.isFalse(dom.hasAttribute('dogs'), "Should not have attribute added via binding");
        return assert.isTrue(dom.hasAttribute('cats'), "Should have attribute that was not from bindings");
    });
});
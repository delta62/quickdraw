/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Bindings.Event", function() {
    let prepClick = function() {
        let event = sandbox.document.createEvent("MouseEvents");
        event.initMouseEvent("click", true, true);
        return event;
    };

    beforeEach(() => sinon.spy(sandbox.document, 'addEventListener'));

    it("Handler is bound to event keyword", assertModuleBound("event"));

    it("Events are registered on parent document instead of node", function() {
        let node = createVirtualElement('div');
        node.addEventListener = sinon.stub();
        let data = { click : sinon.stub() };

        let callback = qdGetInitialize("event");
        callback(data, node);

        assert.isFalse(node.addEventListener.called, "Should not have added listener to node");
        assert.isTrue(sandbox.document.addEventListener.calledWith('click'), "Should have registered click on body");

        return assert.equal(node.getValue('click', 'event'), data.click, "Should have stored the click callback in the node storage");
    });

    it("Events are only registered for once", function() {
        let node = createVirtualElement('div');
        sandbox.qd._.storage.setValue(sandbox.document, 'registry', {
            click : sinon.stub()
        }, 'event');
        let data = { click : sinon.stub() };

        let callback = qdGetInitialize("event");
        callback(data, node);

        return assert.isFalse(sandbox.document.addEventListener.called, "Should not have called add event, already registered");
    });

    it("Events properly trigger their callbacks", function() {
        let node = createVirtualElement('div');
        let data = { click : sinon.stub() };

        let callback = qdGetInitialize("event");
        callback(data, node);

        let clickEvent = prepClick();
        // call dispatch so target set correctly, but jsdom does not properly model events
        node.getRawNode().dispatchEvent(clickEvent);
        sinon.spy(clickEvent, 'preventDefault');

        // call into our global handler that would properly 
        let dispatchEvent = sandbox.document.addEventListener.firstCall.args[1];
        dispatchEvent(clickEvent);

        assert.isTrue(data.click.called, "Should have called callback for event");
        return assert.isTrue(clickEvent.preventDefault.called, 'Should prevent default by default');
    });

    return it("Default can be explicitly allowed by event", function() {
        let node = createVirtualElement('div');
        let data = { click : sinon.spy(() => true) };

        let callback = qdGetInitialize("event");
        callback(data, node);

        let clickEvent = prepClick();
        node.getRawNode().dispatchEvent(clickEvent);
        sinon.spy(clickEvent, 'preventDefault');

        let dispatchEvent = sandbox.document.addEventListener.firstCall.args[1];
        dispatchEvent(clickEvent);

        return assert.isFalse(clickEvent.preventDefault.called, "Should not have prevented default");
    });
});
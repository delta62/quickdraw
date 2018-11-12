/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Internal.Renderer", function() {
    describe("enqueue(virtualNode)", function() {
        it("errors on invalid data", function() {
            let errorSpy = (sandbox.qd._.errors.throw = sinon.spy());
            sandbox.qd._.renderer.enqueue();

            assert.isTrue(errorSpy.called, "Should have thrown an error");
            errorSpy.reset();

            let node = sandbox.document.createElement('div');
            sandbox.qd._.renderer.enqueue(node);
            return assert.isTrue(errorSpy.called, "Should have thrown an error on a regular dom node");
        });

        it("virtual node added to queue", function() {
            let node = sandbox.document.createElement('div');
            let virtualNode = sandbox.qd._.dom.virtualize(node);

            sandbox.qd._.renderer.enqueue(virtualNode);
            return assert.equal(sandbox.qd._.state.render.queue[0], virtualNode, "Virtual node should be stored in render queue");
        });

        return it("virtual nodes are added to queue in order enqueued", function() {
            let node = sandbox.document.createElement('div');
            let node2 = sandbox.document.createElement('div');

            let virtualNode = sandbox.qd._.dom.virtualize(node);
            let virtualNode2 = sandbox.qd._.dom.virtualize(node2);

            assert.isTrue(virtualNode.getUniqueId() < virtualNode2.getUniqueId(), "Unique ids are ordered");

            sandbox.qd._.renderer.enqueue(virtualNode2);
            sandbox.qd._.renderer.enqueue(virtualNode);
            assert.equal(sandbox.qd._.state.render.queue[0], virtualNode2, "Should enqueue nodes in order given but first node is not first");
            assert.equal(sandbox.qd._.state.render.queue[1], virtualNode, "Should enqueue nodes in order given but second node is first");

            let genPatch = sinon.stub(virtualNode, 'generatePatch');
            let genPatch2 = sinon.stub(virtualNode2, 'generatePatch', () => assert.isFalse(genPatch.called, "Should not have called generate patch on node 1 yet"));

            let emitPatch = sinon.stub(virtualNode, 'emit');
            let emitPatch2 = sinon.stub(virtualNode2, 'emit', () => assert.isFalse(emitPatch.called, "Should not have called emit on node 1 yet"));

            return sandbox.qd._.renderer.render();
        });
    });

    describe("render()", function() {
        let fakeVirtualNode = function(shouldHavePatch = false) {
            let patch = shouldHavePatch ? {} : null;

            return {
                patch,
                generatePatch : sinon.spy(() => patch),
                emit : sinon.spy()
            };
        };

        return it("gets patches for every node", function() {
            let node;
            let nodes = [];
            let renderCount = 0;
            for (let i = 0; i < 10; i++) {
                if ((i % 2) === 0) {
                    renderCount++;
                }
                node = fakeVirtualNode((i % 2) === 0);
                nodes.push(node);
                sandbox.qd._.state.render.queue[i] = node;
            }

            let renderSpy = (sandbox.qd._.renderer.renderPatch = sinon.spy());

            sandbox.qd._.renderer.render();

            for (node of nodes) {
                assert.isTrue(node.generatePatch.called, "Should have called generate patch on node");
                assert.isTrue(node.emit.calledWith('render', null, false), "Should have emitted a synchronous render event");
                if (node.patch != null) {
                    assert.isTrue(renderSpy.calledWith(node.patch), "Should have called render for nodes patch");
                }
            }

            return assert.equal(renderSpy.callCount, renderCount, "Should have rendered all nodes with patches");
        });
    });

    return describe("renderPatch(patch)", function() {
        it("sets all properties from patch", function() {
            let properties = {
                first : 'yes',
                second : true,
                third : null
            };
            let patch = {
                node : {},
                properties,
                attributes : {},
                styles : {},
                children : []
            };

            sandbox.qd._.renderer.renderPatch(patch);
            for (let property in properties) {
                let value = properties[property];
                assert.equal(value, patch.node[property], `Should have set property '${property}' of node to '${value}'`);
            }

        });

        it("sets all attributes from patch", function() {
            let attributes = {
                first : 'thing',
                second : null,
                third : true,
                fourth : false
            };
            let patch = {
                node : {
                    setAttribute : sinon.spy(),
                    removeAttribute : sinon.spy()
                },
                properties : {},
                attributes,
                styles : {},
                children : []
            };

            sandbox.qd._.renderer.renderPatch(patch);
            for (let attribute in attributes) {
                let value = attributes[attribute];
                if (value === null) {
                    assert.isTrue(patch.node.removeAttribute.calledWith(attribute), `Should have removed attribute '${attribute}'`);
                } else {
                    assert.isTrue(patch.node.setAttribute.calledWith(attribute, value), `Should have set attribute '${attribute}' to value '${value}'`);
                }
            }

        });

        it("sets all styles from patch", function() {
            let styles = {
                first : 'thing',
                second : true
            };
            let patch = {
                node : {
                    style : {}
                },
                properties : {},
                attributes : {},
                styles,
                children : []
            };

            sandbox.qd._.renderer.renderPatch(patch);
            return assert.deepEqual(patch.node.style, styles, "Should have set all the styles on the node");
        });

        return it("apply children patches properly", function() {
            let parent = {
                removeChild: sinon.spy(),
                insertBefore: sinon.spy()
            };

            let children = [
                {
                    type : "remove",
                    value : {
                        parentNode : parent
                    }
                },
                {
                    type : "insert",
                    value : {},
                    leads : {}
                },
                {
                    type : "insert",
                    value : {},
                    follows : {
                        nextSibling : {}
                    }
                },
                {
                    type : "insert",
                    value : {}
                }
            ];
            let patch = {
                node : parent,
                properties : {},
                attributes : {},
                styles : {},
                children
            };

            sandbox.qd._.renderer.renderPatch(patch);
            // check first ndoe is removed
            let firstChild = children[0];
            assert.isTrue(firstChild.value.parentNode.removeChild.calledWith(firstChild.value), "Should have removed a child with a remove action");

            let secondChild = children[1];
            assert.isTrue(patch.node.insertBefore.calledWith(secondChild.value, secondChild.leads), "Should insert with lead references if there is one");

            let thirdChild = children[2];
            assert.isTrue(patch.node.insertBefore.calledWith(thirdChild.value, thirdChild.follows.nextSibling), "Should insert with sibling of node that is followed");

            let fourthChild = children[3];
            return assert.isTrue(patch.node.insertBefore.calledWith(fourthChild.value, null), "No leading or following causes insertion at the end");
        });
    });
});

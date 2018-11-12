/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Internal.Templates", function() {
    let generateFakeNodes = count => __range__(0, count, false).map((i) => sandbox.document.createElement('div'));

    let virtualizeNodes = nodes => nodes.map((node) => sandbox.qd._.dom.virtualize(node));

    let unvirtualizeNodes = nodes => nodes.map((node) => sandbox.qd._.dom.unwrap(node));

    let getHTML = function(nodes) {
        let html = "";
        for (let node of nodes) {
            html += node.outerHTML;
        }

        return html;
    };

    let getInternalFromAlias = alias => sandbox.qd._.state.templates.aliases[alias];

    let getInternalFromHtml = html => sandbox.qd._.state.templates.html[html];

    let getStoredNodes = name => sandbox.qd._.state.templates.nodes[name];

    describe("exists(name)", function() {
        it("exists works for internal name", function() {
            let templateNodes = generateFakeNodes(5);
            let templateName = sandbox.qd._.templates.register(templateNodes);

            return assert.isTrue(sandbox.qd._.templates.exists(templateName), "Template should exist after registration");
        });

        return it("exists works for alias name", function() {
            let templateNodes = generateFakeNodes(5);
            let templateName = "myspecialname";
            sandbox.qd._.templates.register(templateNodes, templateName);
            return assert.isTrue(sandbox.qd._.templates.exists(templateName), "Template should exist after registration");
        });
    });

    describe("get(name, doc)", function() {
        beforeEach(function() {
            sandbox.templateNodes = generateFakeNodes(5);
            for (let node of sandbox.templateNodes) {
                node.textContent = Math.random();
            }
            return sandbox.templateName = sandbox.qd._.templates.register(sandbox.templateNodes);
        });

        it("requesting a non-existant template errors", function() {
            let errorSpy = (sandbox.qd._.errors.throw = sinon.spy());
            sandbox.qd._.templates.get("doesntexist");

            return assert.isTrue(errorSpy.calledOnce, "Should have called error spy");
        });

        it("should be given back virtualized nodes", function() {
            let nodeSet = sandbox.qd._.templates.get(sandbox.templateName);
            return nodeSet.map((node, i) =>
                assert.instanceOf(node, sandbox.qd._.dom.VirtualDomNode, `Node at position ${i} is not a virtual node`));
        });

        it("requesting template from get returns nodes with same html but not the same nodes", function() {
            let nodeSet = sandbox.qd._.templates.get(sandbox.templateName);
            let originalHTML = getHTML(sandbox.templateNodes);
            let copyHTML = getHTML(unvirtualizeNodes(nodeSet));
            assert.equal(nodeSet.length, sandbox.templateNodes.length, "Should have same number of nodes");
            assert.equal(copyHTML, originalHTML, "Should generate the same html");
            return sandbox.templateNodes.map((node, i) =>
                assert.notEqual(nodeSet[i].getRawNode(), node, `Should not have the same node at position ${i}`));
        });

        it("requesting uncached template with no document simply clones main template", function() {
            for (var node of sandbox.templateNodes) {
                sinon.spy(node, "cloneNode");
            }

            let nodeSet = sandbox.qd._.templates.get(sandbox.templateName);
            return (() => {
                let result = [];
                for (let i = 0; i < sandbox.templateNodes.length; i++) {
                    node = sandbox.templateNodes[i];
                    result.push(assert.isTrue(node.cloneNode.calledWith(true), `Should have recursively cloned node ${i}`));
                }
                return result;
            })();
        });

        it("requesting uncached template with document imports main template", function() {
            var fakeDocument = {
                importNode : sinon.spy(function(node, deep) { 
                    node._ownerDocument = fakeDocument;
                    return node;
                }),
                adoptNode : sinon.spy(node => node)
            };
            let nodeSet = sandbox.qd._.templates.get(sandbox.templateName, fakeDocument);
            assert.equal(fakeDocument.importNode.callCount, nodeSet.length, "Should have been called for every node");
            assert.equal(fakeDocument.adoptNode.callCount, 0, "Should not have called adopt since they were created with new document");
            return (() => {
                let result = [];
                let iterable = unvirtualizeNodes(nodeSet);
                for (let i = 0; i < iterable.length; i++) {
                    let node = iterable[i];
                    result.push(assert.deepEqual(fakeDocument.importNode.getCall(i).args, [node, true], `Should have been told to recursively import node ${i}`));
                }
                return result;
            })();
        });

        it("requesting cached template with same document as original does no extra adoption", function() {
            let nodeSet = sandbox.qd._.templates.get(sandbox.templateName, sandbox.document);
            sandbox.qd._.templates.return(sandbox.templateName, nodeSet);
            let adoptSpy = (sandbox.document.adoptNode = sinon.spy());
            let nodeSet2 = sandbox.qd._.templates.get(sandbox.templateName, sandbox.document);
            assert.isFalse(adoptSpy.called, "Should not have adopted any nodes");
            return assert.deepEqual(nodeSet2, nodeSet, "Should have returned the same nodes from before");
        });

        return it("requesting cached template with a new document causes adoption of each node", function() {
            let nodeSet = sandbox.qd._.templates.get(sandbox.templateName, sandbox.document);
            sandbox.qd._.templates.return(sandbox.templateName, nodeSet);
            let adoptSpy = sinon.spy(node => node);
            sandbox.qd._.templates.get(sandbox.templateName, {
                adoptNode : adoptSpy
            });
            return assert.equal(adoptSpy.callCount, nodeSet.length, "Should have adopted each node");
        });
    });

    describe("return(name, nodes)", function() {
        it("throws error if returning missing template", function() {
            let errorSpy = (sandbox.qd._.errors.throw = sinon.spy());
            sandbox.qd._.templates.return("fakeNodes", []);

            return assert.isTrue(errorSpy.calledOnce, "Should have thrown an error");
        });

        return it("all nodes given are unwrapped", function() {
            let templateName = sandbox.qd._.templates.register(generateFakeNodes(1));
            let nodeSet = sandbox.qd._.templates.get(templateName);
            let unwrapSpy = sinon.spy(sandbox.qd._.dom, "unwrap");
            sandbox.qd._.templates.return(templateName, nodeSet);
            return nodeSet.map((node, i) =>
                assert.isTrue(unwrapSpy.calledWith(node), `Should have unwrapped node at position ${i}`));
        });
    });

    describe("register(nodes, name)", function() {
        it("registered templates are stored correctly", function() {
            let templateNodes = generateFakeNodes(5);
            let templateHTML = getHTML(templateNodes);

            let templateName = sandbox.qd._.templates.register(templateNodes);

            assert.equal(getInternalFromHtml(templateHTML), templateName, "Template html maps to the name");
            let nodes = getStoredNodes(templateName);
            assert.isDefined(nodes, "Template nodes should be stored");
            return nodes.map((node, i) =>
                assert.equal(node, templateNodes[i], `Node ${i} should match original array`));
        });

        it("registering with the same name twice produces an error", function() {
            let errorSpy = (sandbox.qd._.errors.throw = sinon.spy());
            let templateNodes = generateFakeNodes(5);

            sandbox.qd._.templates.register(templateNodes, "fakeName");
            sandbox.qd._.templates.register([], "fakeName");

            return assert.isTrue(errorSpy.calledOnce, "Should have thrown an error for registering with the same name twice");
        });

        it("registering with a name stores with the name", function() {
            let templateNodes = generateFakeNodes(1);
            let templateHTML = getHTML(templateNodes);
            let templateName = "aTemplate";
            let result = sandbox.qd._.templates.register(templateNodes, templateName);

            assert.equal(result, templateName, "Should return the template name that was given");

            let internalName = getInternalFromAlias(templateName);
            assert.isDefined(internalName, "Should have used given name as an alias");

            let internalHtmlName = getInternalFromHtml(templateHTML);
            assert.isDefined(internalHtmlName, "Should have html stored");
            return assert.equal(internalHtmlName, internalName, "Stored html should reference internal name");
        });

        it("registering without a node returns the internal name", function() {
            let templateNodes = generateFakeNodes(1);
            let templateHTML = getHTML(templateNodes);
            let result = sandbox.qd._.templates.register(templateNodes);

            assert.isUndefined(getInternalFromAlias(result), "Result should be internal name, not an alias");
            assert.isDefined(getStoredNodes(result), "Should have nodes linked with result name");
            return assert.equal(getInternalFromHtml(templateHTML), result, "Template html should link to given internal name");
        });

        it("templates that produce the same html are considered the same template internally", function() {
            let templateNodes = generateFakeNodes(3);

            let firstName = sandbox.qd._.templates.register(templateNodes, "first");
            let secondName = sandbox.qd._.templates.register(templateNodes, "second");

            assert.notEqual(firstName, secondName, "Templates should have separate names");
            let firstAlias = getInternalFromAlias(firstName);
            let secondAlias = getInternalFromAlias(secondName);
            assert.isDefined(firstAlias, "Should have alias for first name");
            assert.isDefined(secondAlias, "Should have alias for second name");
            return assert.equal(firstAlias, secondAlias, "Both aliases should point to the same internal name");
        });

        it("registering virtualized nodes stores raw ones", function() {
            let templateNodes = generateFakeNodes(4);
            let virtualNodes = virtualizeNodes(templateNodes);

            let unwrapSpy = sinon.spy(sandbox.qd._.dom, "unwrap");

            let virtualName = sandbox.qd._.templates.register(virtualNodes);
            for (let index = 0; index < virtualNodes.length; index++) {
                let virtualNode = virtualNodes[index];
                assert.isTrue(unwrapSpy.calledWith(virtualNode), `Should unwrap node at index ${index}`);
            }

            let realName = sandbox.qd._.templates.register(templateNodes);
            return assert.equal(virtualName, realName, "Registering virtual and real nodes for same html should have same internal name");
        });

        return it("Any quickdraw data stored on nodes is cleared when registered", function() {
            let templateNodes = generateFakeNodes(1);
            sandbox.qd._.storage.setInternalValue(templateNodes[0], "test", true);
            let storageSpy = sinon.spy(sandbox.qd._.storage, "clearValues");

            sandbox.qd._.templates.register(templateNodes);

            assert.isTrue(storageSpy.calledWith(templateNodes[0]), "Should have cleared data on template node");
            return assert.isNull(sandbox.qd._.storage.getInternalValue(templateNodes[0], "test"), "Should have erased stored values");
        });
    });

    describe("unregister(name)", () =>
        it("calling unregister with an alias deletes the alias", function() {
            let templateName = "fakeName";
            sandbox.qd._.templates.register(generateFakeNodes(1), templateName);
            assert.isDefined(sandbox.qd._.state.templates.aliases[templateName], "Should have alias defined");
            sandbox.qd._.templates.unregister(templateName);
            return assert.isUndefined(sandbox.qd._.state.templates.aliases[templateName], "Should no longer have alias defined");
        })
    );

    return describe("clearCache()", () =>
        it("after clear nodes must be regenerated on request", function() {
            let templateName = sandbox.qd._.templates.register(generateFakeNodes(1));
            let nodeSet = sandbox.qd._.templates.get(templateName);
            sandbox.qd._.templates.return(templateName, nodeSet);
            sandbox.qd._.templates.clearCache();
            let nodeSet2 = unvirtualizeNodes(sandbox.qd._.templates.get(templateName));

            return unvirtualizeNodes(nodeSet).map((node) =>
                assert.isFalse(__in__(node, nodeSet2), "Should not have node returned from cache"));
        })
    );
});

describe("Quickdraw.External.Templates", () =>
    describe("registerTemplate(name, templateNodes)", function() {
        it("registration should pass through to internal method", function() {
            let registerSpy = (sandbox.qd._.templates.register = sinon.spy());
            let name = "name";
            let nodes = [];
            sandbox.qd.registerTemplate(name, nodes);

            return assert.isTrue(registerSpy.calledWith(nodes, name), "Should have called register spy with given data");
        });

        return it("throws an error for a non-array second parameter", function() {
            let errorSpy = (sandbox.qd._.errors.throw = sinon.spy());

            sandbox.qd.registerTemplate("");
            assert.isTrue(errorSpy.called, "Should have called error for undefined parameter");
            errorSpy.reset();

            sandbox.qd.registerTemplate("", {});
            assert.isTrue(errorSpy.called, "Should have called error for object parameter");
            errorSpy.reset();

            sandbox.qd.registerTemplate("", 1);
            assert.isTrue(errorSpy.called, "Should have called error for primative parameter");
            errorSpy.reset();

            sandbox.qd.registerTemplate("", null);
            return assert.isTrue(errorSpy.called, "Should have called error for null parameter");
        });
    })
);

function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}
function __in__(needle, haystack) {
  return Array.from(haystack).indexOf(needle) >= 0;
}
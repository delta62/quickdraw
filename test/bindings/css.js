/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Bindings.CSS", function() {
    let parseClassList = function(dom) {
        let classes = dom.getProperty('className').trim().split(/ +/);
        let applied = {};
        for (let item of classes) {
            applied[item] = true;
        }
        return applied;
    };

    let testClassesApplied = function(classes, shouldBe, dom) {
        if (dom == null) {
            dom = createVirtualElement('div');
        }

        let initialize = qdGetInitialize('css');
        initialize(classes, dom);

        let update = qdGetUpdate('css');
        update(classes, dom);

        // parse the class list
        let applied = parseClassList(dom);

        // check applied classes against should be
        for (let klass of applied) {
            if (shouldBe.indexOf(klass) > -1) {
                assert.isTrue(applied[klass], `Class correctly added: ${klass}`);
            } else {
                assert.isUndefined(applied[klass], `Class incorrectly added: ${klass}`);
            }
        }

        return dom;
    };

    it("Handler is bound to css keyword", assertModuleBound('css'));

    it("Adds a single class", () =>
        testClassesApplied({
            addMe : true
        }, ['addMe'])
    );

    it("Adds two classes", () =>
        testClassesApplied({
            first : true,
            second : true
        }, ['first', 'second'])
    );

    it("Adds only true classes", () =>
        testClassesApplied({
            first : true,
            second : false,
            third : true
        }, ['first', 'third'])
    );

    it("If binding data is observable, it unwraps it", () =>
        testClassesApplied(sandbox.qd.observable({
            first : true,
            second : false
        }), ['first'])
    );

    it('Class that disappears is removed', function() {
        let dom = createVirtualElement('div');
        dom.getRawNode().className = 'here there';
        testClassesApplied({
            other : true
        }, ['here', 'there', 'other'], dom);

        return testClassesApplied({}, ['here', 'there'], dom);
    });

    it("Ignores any classes not specified", function() {
        let dom = createVirtualElement('div');
        dom.getRawNode().className = 'here there';
        return testClassesApplied({
            other : true
        }, ['here', 'there', 'other'], dom);
    });

    it("Existing classes are not duplicated by binding", function() {
        let dom = createVirtualElement('div');
        dom.getRawNode().className = 'here there';
        return testClassesApplied({
            here : true
        }, ['here', 'there'], dom);
    });

    it("Existing classes can be removed by binding", function() {
        let dom = createVirtualElement('div');
        dom.getRawNode().className = 'here there';
        return testClassesApplied({
            here : false,
            other : true
        }, ['there', 'other'], dom);
    });

    it("Does not remove classes specifed on node", function() {
        let dom = createVirtualElement('div');
        dom.getRawNode().className = 'here there where';
        return testClassesApplied({}, ['here', 'where', 'there'], dom);
    });

    it("If binding data is just a string, uses as a class name", () => testClassesApplied('cats', ['cats']));

    it('Object attribute \'_$\' has value used as a class', () =>
        testClassesApplied({
            _$ : "everything exists",
            reason : true,
            always : false
        }, ['everything', 'exists', 'reason'])
    );

    it('Values applied via \'_$\' are properly updated', function() {
        let element = testClassesApplied({
            _$ : "everything exists",
            other : true
        }, ['everything', 'exists']);

        return testClassesApplied({
            _$ : "nothing",
            other : true
        }, ['nothing'], element);
    });

    it("initialize method properly stores off original data", function() {
        let originalString = "whats up there";
        let dom = createVirtualElement('div');
        dom.getRawNode().className = originalString;

        let initialize = qdGetInitialize('css');
        initialize({}, dom);

        return assert.deepEqual(dom.getValue('original', 'css'), originalString.split(' '), "Original string correctly stored");
    });

    it("cleanup properly returns the data", function() {
        let originalString = "whats up";
        let dom = createVirtualElement('div');
        dom.getRawNode().className = originalString;

        let initialize = qdGetInitialize('css');
        initialize({}, dom);

        dom.setProperty('className', '');

        let cleanup = qdGetCleanup('css');
        cleanup(dom);

        return assert.equal(dom.getProperty('className'), originalString, "Should have returned original string");
    });

    return it("cleanup returns data previously removed", function() {
        let originalString = "whats up";
        let dom = createVirtualElement('div');
        dom.getRawNode().className = originalString;

        let initialize = qdGetInitialize('css');
        initialize({}, dom);

        let update = qdGetUpdate('css');
        update({
            whats: false
        }, dom);

        let cleanup = qdGetCleanup('css');
        cleanup(dom);

        return assert.equal(dom.getProperty('className'), originalString, "Should have restored binding removed string");
    });
});

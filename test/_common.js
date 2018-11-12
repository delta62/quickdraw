/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import vm from "vm";
import fs from "fs";

let COMPILED_PATH = "bin/quickdraw.js";

// load cached quickdraw script
let rawSource = fs.readFileSync(COMPILED_PATH, "utf8");
let cachedScript = vm.createScript(rawSource, COMPILED_PATH);

// setup test environment
global.chai = require('chai');
global.assert = require('chai').assert;
global.expect = require('chai').expect;
global.sinon = require('sinon');
global.jsdom = require('jsdom');

global.assertModuleBound = moduleName =>
    () => assert.isNotNull(sandbox.qd._.state.binding.handlers[moduleName], `${moduleName} handler should be bound`)
;

global.createVirtualElement = (type = 'div') => sandbox.qd._.dom.virtualize(sandbox.document.createElement(type));

beforeEach(function() {
    // construct a sandbox to test in
    let sandbox = (global.sandbox = vm.createContext({
        Error,
        Array,
        console,
        _$jscoverage : global._$jscoverage != null ? global._$jscoverage : null
    }));

    sandbox.setTimeout = sinon.spy(global.setTimeout);
    sandbox.clearTimeout = sinon.spy(global.clearTimeout);

    global.qdGetInitialize = handleName => sandbox.qd._.handlers.getInitialize(handleName);

    global.qdGetUpdate = handleName => sandbox.qd._.handlers.getUpdate(handleName);

    global.qdGetCleanup = handleName => sandbox.qd._.handlers.getCleanup(handleName);

    // construct a sandboxed quickdraw
    cachedScript.runInContext(sandbox);

    // refresh the dom
    let dom = jsdom.jsdom();
    sandbox.window = dom.defaultView;
    return sandbox.document = sandbox.window.document;
});
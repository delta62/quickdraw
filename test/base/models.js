/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Models", function() {
    describe("create(model)", function() {
        it("Raw model converted to quickdraw model", function() {
            let model = { raw : true };
            let created = sandbox.qd._.models.create(model);
            assert.equal(created.raw, model, "Raw model stored properly");
            assert.isTrue(created.__isModel, "Model properly wrapped");
            return assert.isNull(created.__parent, "Parent set to null");
        });

        return it("Already wrapped model not modified", function() {
            let model = sandbox.qd._.models.create({ raw : true });

            return assert.equal(sandbox.qd._.models.create(model), model, "Wrapped model directly returned");
        });
    });

    return describe("isModel(object)", function() {
        it("Given a non-model returns false", function() {
            let model = {};
            return assert.isFalse(sandbox.qd._.models.isModel(model));
        });

        return it("Given a model returns true", function() {
            let model = sandbox.qd._.models.create({ raw : true });
            return assert.isTrue(sandbox.qd._.models.isModel(model));
        });
    });
});
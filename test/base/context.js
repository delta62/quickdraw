/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Internal.Context", () =>
    describe("create(viewModel):", function() {
        it("Base context properly created", function() {
            let model = sandbox.qd._.models.create({ cats : true });
            let context = sandbox.qd._.context.create(model);

            assert.equal(context.$data, model.raw, "Model set properly");
            assert.equal(context.$rawData, model.raw, "Raw data set properly");
            assert.equal(context.$parents.length, 0, "Parents array empty");
            assert.isNull(context.$parent, "No parent");
            assert.isNull(context.$parentContext, "Parent context doesnt exist");
            return assert.equal(context.$root, model.raw, "Model given is root since base");
        });

        it("Context extended properly", function() {
            let model = sandbox.qd._.models.create({ cats : true });
            let context = sandbox.qd._.context.create(model);
            let newModel = { dogs : true };
            let extended = context.$extend(newModel);

            assert.equal(context.$data, model.raw, "Model not changed on original");
            assert.equal(context.$rawData, model.raw, "Raw data not changed on original");
            assert.equal(context.$parents.length, 0, "Parents array empty for original");
            assert.isNull(context.$parent, "No parent for original");
            assert.isNull(context.$parentContext, "Parent context doesnt exist for original");
            assert.equal(context.$root, model.raw, "Model given is still root for original");
            assert.equal(extended.$data, newModel, "New model is now data");
            assert.equal(extended.$rawData, newModel, "New model is now raw data");
            assert.equal(extended.$parents.length, 1, "Parents array has one thing in extended");
            assert.equal(extended.$parent, model.raw, "Parent model is correct");
            assert.equal(extended.$parentContext, context, "Parent context correctly saved");
            return assert.equal(extended.$root, model.raw, "Root remains unchanged");
        });

        return it("Context created from previously used model is parent", function() {
            let model = sandbox.qd._.models.create({ cats : true });
            model.__context = {};
            let newModel = sandbox.qd._.models.create({ dogs : true });
            newModel.__parent = model;
            let context = sandbox.qd._.context.create(newModel);
            assert.equal(context.$data, newModel.raw, "New model is now data");
            assert.equal(context.$rawData, newModel.raw, "New model is now raw data");
            assert.equal(context.$parents.length, 1, "Parents array has one thing in extended");
            assert.equal(context.$parent, model.raw, "Parent model is correct");
            assert.isNotNull(context.$parentContext, "Parent context correctly saved");
            return assert.equal(context.$root, model.raw, "Root remains unchanged");
        });
    })
);

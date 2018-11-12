/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Internal.Cache", function() {
    it("When get is called and nothing is in the cache the generator is called", function() {
        let generatorSpy = sinon.spy(() => 1);

        let cache = sandbox.qd._.cache.create(generatorSpy);

        let result = cache.get(1);

        assert.equal(result, 1, "Should return the result from the generator");
        return assert.isTrue(generatorSpy.calledOnce, "Should have called the generator as cache was empty");
    });

    it("When item is in the cache generator is not called", function() {
        let generatorSpy = sinon.spy(() => 1);

        let cache = sandbox.qd._.cache.create(generatorSpy);

        cache.put(1, 1);
        let result = cache.get(1);

        assert.equal(result, 1, "Should return the previously stored value");
        return assert.isFalse(generatorSpy.called, "Should not have called generator as value was available");
    });

    return it("When cache is cleared the generator is called", function() {
        let generatorSpy = sinon.spy(() => 2);

        let cache = sandbox.qd._.cache.create(generatorSpy);
        cache.put(1, 1);
        cache.clear();
        let result = cache.get(1);

        assert.equal(result, 2, "Should return the result of the generator");
        return assert.isTrue(generatorSpy.calledOnce, "Should have called the generator since cache was cleared");
    });
});
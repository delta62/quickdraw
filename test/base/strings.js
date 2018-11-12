/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe("Quickdraw.Internal.Strings", function() {
    describe("appendWithDelimiter(string, item, delimiter)", function() {
        it("Non-empty string has delimiter and item added", function() {
            let string = "hello";
            let delimiter = " ";
            let item = "world!";
            let combined = sandbox.qd._.strings.appendWithDelimiter(string, item, delimiter);
            return assert.equal(combined, string + delimiter + item, "Strings are equal");
        });

        it("Empty string does not add delimiter", function() {
            let combined = sandbox.qd._.strings.appendWithDelimiter("", "alone", " ");
            return assert.equal(combined, "alone", "Strings are equal");
        });

        return it("Delimiter at end is not repeated", function() {
            let string = "hello ";
            let delimiter = " ";
            let item = "world!";
            let combined = sandbox.qd._.strings.appendWithDelimiter(string, item, delimiter);
            return assert.equal(combined, string + item, "Strings are equal");
        });
    });

    return describe("Tokenizer", function() {
        it("Tokenizer properly splits on delimiter singles", function() {
            let words = ["hello", "to", "the", "world"];
            let string = words.join(" ");
            let delimiter = " ";
            let tokenizer = new sandbox.qd._.strings.tokenizer(string, delimiter);
            let pieces = tokenizer.toArray();
            assert.equal(pieces.length, words.length, "All pieces found");
            return words.map((word, i) =>
                assert.equal(pieces[i], word, "Pieces found in correct order"));
        });

        it("Tokenizer splits with arbitrary delimiter repetition", function() {
            let words = ["hello", "to", "the", "world"];
            let string = `${words[0]}     ${words[1]} ${words[2]} ${words[3]}`;
            let delimiter = " ";
            let tokenizer = new sandbox.qd._.strings.tokenizer(string, delimiter);
            let pieces = tokenizer.toArray();
            assert.equal(pieces.length, words.length, "All pieces found");
            return words.map((word, i) =>
                assert.equal(pieces[i], word, "Pieces found in correct order"));
        });

        it("Tokenizer with string that doesnt contain delimiter returns whole string", function() {
            let string = "helloworld";
            let delimiter = " ";
            let tokenizer = new sandbox.qd._.strings.tokenizer(string, delimiter);
            assert.equal(tokenizer.nextToken(), string, "Only thing returned is all");
            return assert.isNull(tokenizer.nextToken(), "Nothing else left");
        });

        it("Tokenizer returns null for null string", function() {
            let tokenizer = new sandbox.qd._.strings.tokenizer(null, " ");
            return assert.isNull(tokenizer.nextToken(), "Null string is null");
        });

        return it("Tokenizer returns null after all pieces found", function() {
            let string = "hello world";
            let delimiter = " ";
            let tokenizer = new sandbox.qd._.strings.tokenizer(string, delimiter);
            assert.equal(tokenizer.nextToken(), "hello", "First word correct");
            assert.equal(tokenizer.nextToken(), "world", "Second word correct");
            return assert.isNull(tokenizer.nextToken(), "Everything else null");
        });
    });
});
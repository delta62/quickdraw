/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// A set of methods and objects that can be used to manipulate strings
qdInternal.strings = {
    // Appends to a string to another string using the delimiter specified
    // If the first string already ends in the given delimiter then the
    // delimiter is not added again.
    // @param [String] string the base string to add to
    // @param [String] item the item to append to the string
    // @param [Char] delimiter a single character to act as a delimiter
    // @return appropriate equivalent to string + delimiter + item
    appendWithDelimiter(string, item, delimiter) {
        let result = string;
        if ((result.length > 0) && (result[result.length - 1] !== delimiter)) {
            result += delimiter;
        }
        result += item;
        return result;
    },

    // A tokenizer class that can be used to extract tokens from a string
    // that are separated by a single character delimiter. The delimiter
    // can be repeated any number of times between tokens, all instances
    // will be stripped
    tokenizer : class {
        // Construct a new tokenizer that is based on the given string
        // and delimiter
        // @param [String] string the string to tokenize
        // @param [Char] delimiter the delimiter that will separate tokens
        constructor(string, delimiter) {
            this.string = string;
            this.delimiter = delimiter;
            this.pos = 0;
        }

        // Gets the next token in the string if available
        // @return The next token if there is one, null otherwise
        nextToken() {
            if (this.string == null) {
                return null;
            }

            while ((this.string[this.pos] === this.delimiter) && (this.pos < this.string.length)) {
                ++this.pos;
            }

            let nextpos = this.pos;
            while ((nextpos < this.string.length) && (this.string[nextpos] !== this.delimiter)) {
                ++nextpos;
            }

            if (nextpos > this.pos) {
                let token = this.string.substring(this.pos, nextpos);
                this.pos = nextpos;
                return token;
            }

            return null;
        }

        // Calls the given callback for every token in the string
        // After calling this the tokenizer will always return null
        // from nextToken
        // @param [Function] callback to call with each token
        map(callback) {
            let nextToken;
            while ((nextToken = this.nextToken()) !== null) {
                callback(nextToken);
            }

            // dont capture return
        }

        // Converts the remaining tokens in the string to an array 
        // of tokens. After calling this the tokenizer will return 
        // null from nextToken
        // @return array of remaining tokens from tokenizer
        //         tokens are in the order they appear in the string
        toArray() {
            let values = [];
            this.map(token => values.push(token));
            return values;
        }
    }
};

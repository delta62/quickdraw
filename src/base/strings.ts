/**
 * Appends to a string to another string using the delimiter specified. If the first string already ends in the given
 * delimiter then the delimiter is not added again.
 * @param string the base string to add to
 * @param item the item to append to the string
 * @param delimiter a single character to act as a delimiter
 * @return appropriate equivalent to string + delimiter + item
 */
export function appendWithDelimiter(str: string, item: string, delimiter: string) {
    if (str.length && str[str.length - 1] !== delimiter) {
        str += delimiter;
    }
    return str + item;
}

/**
 * A tokenizer class that can be used to extract tokens from a string that are separated by a single character
 * delimiter. The delimiter can be repeated any number of times between tokens, all instances will be stripped.
 */
export class Tokenizer {
    private pos: number = 0;

    /**
     * Construct a new tokenizer that is based on the given string and delimiter
     * @param string the string to tokenize
     * @param delimiter the delimiter that will separate tokens
     */
    constructor(private str: string, private delimiter: string) { }

    /**
     * Gets the next token in the string if available
     * @return The next token if there is one, null otherwise
     */
    nextToken() {
        if (this.str == null) return null;

        while (this.str[this.pos] === this.delimiter && this.pos < this.str.length) {
            this.pos++;
        }

        let nextpos = this.pos;
        while (nextpos < this.str.length && this.str[nextpos] !== this.delimiter) {
            nextpos++;
        }

        if (nextpos > this.pos) {
            let token = this.str.substring(this.pos, nextpos);
            this.pos = nextpos;
            return token;
        }

        return null;
    }

    /**
     * Calls the given callback for every token in the string. After calling this the tokenizer will always return null
     * from nextToken
     * @param callback to call with each token
     */
    map(callback: (token: string) => void) {
        let nextToken;
        while ((nextToken = this.nextToken()) !== null) {
            callback(nextToken);
        }
    }

    /**
     * Converts the remaining tokens in the string to an array of tokens. After calling this the tokenizer will return
     * null from nextToken
     * @return array of remaining tokens from tokenizer tokens are in the order they appear in the string
     */
    toArray() {
        let values: string[] = [ ];
        this.map(function(token) { values.push(token); });
        return values;
    }
}

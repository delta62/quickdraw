type GeneratorFn = (id: string, ...args: any[]) => any;

class Cache {
    private cache: Record<string, any[]> = { };

    constructor(private generator: GeneratorFn, private size: number) { }

    /**
     * Returns a useable result that is associated with the given id
     * if the id has an object available in the cache then the cache
     * will be used otherwise a new object weill be generated
     * @param [String] id the id associated with a common cache set
     * @return [Object] an object associated with the given id
     */
    get(id: string, ...args: any[]) {
        // if there are no templates in the cache, ask for a new one
        if (!this.cache[id] || !this.cache[id].length) {
            return this.generator(id, [ ...args ]);
        }

        // return an item from the cache
        return this.cache[id].shift();
    }

    /**
     * Returns an object to the cache after it is no longer in use This assumes this object has been completely cleaned
     * and can be correctly reused.
     *
     * @note if the cache size has been reached the object will be discarded
     *
     * @param id the id associated with the given object
     * @param obj the object to add back to the cache
     */
    put(id: string, obj: any) {
        if (!this.cache[id]) {
            this.cache[id] = [ ];
        }

        if (this.cache[id].length < this.size || this.size === -1) {
            this.cache[id].push(obj);
        }
    }

    /**
     * Clears out the current pool cache
     */
    clear() {
        this.cache = { };
    }
}

/**
 * Constructs a new simple caching object that will cache items based on an id string. When a cached item is not
 * available it will call the given generator function with the id
 *
 * @note the cache is completely self contained, losing all references to it will correctly clean it up
 *
 * @param generator a function that will return a cacheable object given an id
 * @param cacheSize the max number of items to cache for any single id
 * @return a pool object with get/put/clear functions defined
 */
export function create(generator: GeneratorFn, cacheSize: number) {
    return new Cache(generator, cacheSize);
}

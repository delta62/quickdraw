/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
qdInternal.profiling = {
    getData() {
        // clean up the data
        for (let id in this.data.timers) {
            let timer = this.data.timers[id];
            delete timer.depth;
            delete timer.start;
        }
        return this.data;
    },

    reset() {
        return this.data = {
            timers : {},
            counts : {},
            groupCounts : {}
        };
    },

    startTimer(id) {
        if (!qd.getConfig('profilingEnabled')) { return; }
        let timerData = this.data.timers[id] != null ? this.data.timers[id] : (this.data.timers[id] = {
            depth : 0,
            times : [],
            average : -1,
            max : -1,
            min : -1,
            start : -1
        });
        timerData.depth++;
        if (timerData.depth === 1) {
            return timerData.start = (new Date()).getTime();
        }
    },

    endTimer(id, payload = {}) {
        // grab end time now for more accurate tracking
        let endTime = (new Date()).getTime();

        if (!qd.getConfig('profilingEnabled')) { return; }
        let timerData = this.data.timers[id];
        if (timerData == null) { return; }
        
        timerData.depth--;
        if (timerData.depth < 1) {
            // reached final endTimer, consolidate data
            let startTime = timerData.start;
            // minor validation
            if (startTime !== -1) {
                let totalTime = endTime - startTime;
                timerData.times.push({
                    start : timerData.start,
                    length : totalTime,
                    payload
                });
                if (timerData.times.length === 1) {
                    // setup initial data if first timing
                    timerData.average = totalTime;
                    timerData.max = totalTime;
                    timerData.min = totalTime;
                } else {
                    // roll into current data
                    timerData.average = (timerData.average + totalTime) / 2;
                    timerData.max = Math.max(timerData.max, totalTime);
                    timerData.min = Math.min(timerData.min, totalTime);
                }
            }

            // reset depth
            timerData.depth = 0;
            return timerData.start = -1;
        }
    },

    count(id) {
        if (!qd.getConfig('profilingEnabled')) { return; }
        if (this.data.counts[id] == null) { this.data.counts[id] = 0; }
        return this.data.counts[id]++;
    },

    groupCount(id, count) {
        if (!qd.getConfig('profilingEnabled')) { return; }
        let group = this.data.groupCounts[id];
        if (group != null) {
            group.counts.push(count);
            group.average = (group.average + count) / 2;
            group.max = Math.max(group.max, count);
            return group.min = Math.min(group.min, count);
        } else {
            return this.data.groupCounts[id] = {
                counts : [count],
                average : count,
                max : count,
                min : count
            };
        }
    }

};

qd.setConfig('profilingEnabled', false);

qd.startProfiling = function() {
    if (!qd.getConfig('profilingEnabled')) {
        qd.setConfig('profilingEnabled', true);
        return qdInternal.profiling.reset();
    }
};

qd.stopProfiling = function() {
    let profilingData = null;
    if (qd.getConfig('profilingEnabled')) {
        profilingData = qdInternal.profiling.getData();
        // reset the data
        qdInternal.profiling.reset();
        qd.setConfig('profilingEnabled', false);
    }

    // Return the profiling data collected if previously enabled
    return profilingData;
};

// since profiling is meant to be unobtrusive to the rest of the system
// we need to wrap methods that we want to actually track
// any new methods will have to manually wrap here for stats
(function() {
    let { profiling } = qdInternal;
    // async methods
    qdInternal.async.immediate = (original =>
        function(...args) {
            profiling.count('internal.async.immediate');
            return original.apply(this, args);
        }
    )(qdInternal.async.delayed);

    qdInternal.async.delayed = (original =>
        function(...args) {
            profiling.count('internal.async.delayed');
            return original.apply(this, args);
        }
    )(qdInternal.async.delayed);

    qdInternal.async.cancel = (original =>
        function(...args) {
            profiling.count('internal.async.cancel');
            return original.apply(this, args);
        }
    )(qdInternal.async.cancel);

    // binding methods
    qd.bindModel = (original =>
        function(...args) {
            profiling.count('external.bindModel');
            profiling.startTimer('external.bindModel');
            original.apply(this, args);
            return profiling.endTimer('external.bindModel');
        }
    )(qd.bindModel);

    qd.unbindModel = (original =>
        function(...args) {
            profiling.count('external.unbindModel');
            profiling.startTimer('external.unbindModel');
            original.apply(this, args);
            return profiling.endTimer('external.unbindModel');
        }
    )(qd.unbindModel);

    qd.disableUpdates = (original =>
        function() {
            profiling.count('external.disableUpdates');
            return original.apply(this);
        }
    )(qd.disableUpdates);

    qd.enableUpdates = (original =>
        function(...args) {
            profiling.count('external.enableUpdates');
            return original.apply(this, args);
        }
    )(qd.enableUpdates);

    qdInternal.binding.runUpdates = (original =>
        function() {
            profiling.count('internal.binding.runUpdates');
            profiling.groupCount('state.queues.updates.length', qdInternal.state.queues.updates.length);
            return original.apply(this);
        }
    )(qdInternal.binding.runUpdates);

    qdInternal.binding.rebindNodes = (original =>
        function(nodes) {
            profiling.count('internal.binding.rebindNodes');
            profiling.groupCount('internal.binding.rebindNodes.count', nodes.length);
            profiling.startTimer('internal.binding.rebindNodes');
            original.call(this, nodes);
            return profiling.endTimer('internal.binding.rebindNodes');
        }
    )(qdInternal.binding.rebindNodes);

    qdInternal.binding.bindModel = (original =>
        function(...args) {
            profiling.count('internal.binding.bindModel');
            profiling.startTimer('internal.binding.bindModel');
            original.apply(this, args);
            return profiling.endTimer('internal.binding.bindModel');
        }
    )(qdInternal.binding.bindModel);

    qdInternal.binding.unbindDomTree = (original =>
        function(...args) {
            profiling.count('internal.binding.unbindDomTree');
            profiling.startTimer('internal.binding.unbindDomTree');
            original.apply(this, args);
            return profiling.endTimer('internal.binding.unbindDomTree');
        }
    )(qdInternal.binding.unbindDomTree);

    qdInternal.binding.bindDomNode = (original =>
        function(...args) {
            let started = false;
            if (args[0].hasAttribute(qd.getConfig('bindingAttribute'))) {
                started = true;
                profiling.startTimer('internal.binding.bindDomNode');
            }
            let result = original.apply(this, args);
            if (started) {
                profiling.endTimer('internal.binding.bindDomNode', {
                    bindingString : args[0].getAttribute(qd.getConfig('bindingAttribute'))
                });
            }
            return result;
        }
    )(qdInternal.binding.bindDomNode);

    // handlers methods
    qd.registerBindingHandler = (original =>
        function(keyword, handler) {
            for (let type of ['initialize', 'update', 'cleanup']) {
                handler[type] = ((type, callback) =>
                    function(...args) {
                        profiling.startTimer(`internal.binding.${keyword}.${type}`);
                        let result = callback.apply(this, args);
                        profiling.endTimer(`internal.binding.${keyword}.${type}`);
                        return result;
                    }
                )(type, handler[type]);
            }

            return original.call(this, keyword, handler);
        }
    )(qd.registerBindingHandler);

    qd.observable =  (original =>
        function(...args) {
            profiling.count('external.observable');
            return original.apply(this, args);
        }
    )(qd.observable);

    qd.computed = (original =>
        function(...args) {
            profiling.count('external.computed');
            return original.apply(this, args);
        }
    )(qd.computed);

    qd.observableArray = (original =>
        function(...args) {
            profiling.count('external.observableArray');
            return original.apply(this, args);
        }
    )(qd.observableArray);

    qdInternal.observables.addDependency = (original =>
        function(...args) {
            profiling.count("internal.observables.dependencies");
            return original.apply(this, args);
        }
    )(qdInternal.observables.addDependency);

    qdInternal.observables.addComputedDependency = (original =>
        function(...args) {
            profiling.count("internal.observables.computedDependencies");
            return original.apply(this, args);
        }
    )(qdInternal.observables.addComputedDependency);

    qdInternal.observables.removeDependency = (original =>
        function(...args) {
            profiling.count("internal.observables.removeDependency");
            return original.apply(this, args);
        }
    )(qdInternal.observables.removeDependency);

    return qdInternal.observables.updateDependencies = (original =>
        function(...args) {
            profiling.count("internal.observables.updateDependencies");
            return original.apply(this, args);
        }
    )(qdInternal.observables.updateDependencies);
})();

/*
 * decaffeinate suggestions:
 * DS202: Simplify dynamic range loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Functions related to the templating subsystem
qdInternal.templates = {
    _uniqueId : 0,

    _generator(name, doc) {
        let nodes = qdInternal.state.templates.nodes[name];
        let newNodes = new Array(nodes.length);
        for (let index = 0; index < nodes.length; index++) {
            let node = nodes[index];
            if (doc != null) {
                // if a document reference is given, import the node with that reference
                newNodes[index] = doc.importNode(node, true);
            } else {
                // otherwise simply clone the node
                newNodes[index] = node.cloneNode(true);
            }
        }
        return newNodes;
    },

    resolve(name) {
        return qdInternal.state.templates.aliases[name] != null ? qdInternal.state.templates.aliases[name] : name;
    },

    exists(name) {
        let realName = qdInternal.state.templates.aliases[name] != null ? qdInternal.state.templates.aliases[name] : name;
        return (qdInternal.state.templates.nodes[realName] != null);
    },

    get(name, doc) {
        let templateState = qdInternal.state.templates;
        let realName = templateState.aliases[name] != null ? templateState.aliases[name] : name;

        if (templateState.nodes[realName] == null) {
            return qdInternal.errors.throw(new QuickdrawError("No template defined for given name"));
        }

        if (templateState.cache == null) {
            // if the cache has not been defined yet, do so now
            templateState.cache = qdInternal.cache.create(qdInternal.templates._generator);
        }

        let nodes = templateState.cache.get(realName, doc);

        for (let i = 0, end = nodes.length, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
            let node = nodes[i];
            if ((doc != null) && (node.ownerDocument !== doc)) {
                // we need to adopt the node before it can be used
                node = doc.adoptNode(node);
            }

            // virtualize the dom node that we return
            nodes[i] = qdInternal.dom.virtualize(node);
            nodes[i].setTemplateName(realName);
        }

        // return the nodes
        return nodes;
    },

    return(name, nodes) {
        let templateState = qdInternal.state.templates;
        let realName = templateState.aliases[name] != null ? templateState.aliases[name] : name;

        if (templateState.nodes[realName] == null) {
            return qdInternal.errors.throw(new QuickdrawError("Given name is not a valid template name"));
        }

        // ensure the nodes are unwrapped if they are virtual
        let storageNodes = new Array(nodes.length);
        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i];
            storageNodes[i] = qdInternal.dom.unwrap(node);
        }

        templateState.cache.put(realName, storageNodes);
    },

    register(nodes, name) {
        let templateName;
        let templateState = qdInternal.state.templates;

        if (templateState.aliases[name] != null) {
            return qdInternal.errors.throw(new QuickdrawError(`Template already defined for given name \`${name}\``));
        }

        // Virtual nodes may already be from a template. If that's the case, they do not
        // need to be parsed into HTML again.
        if ((nodes[0] != null) && (nodes[0] instanceof qdInternal.dom.VirtualDomNode)) {
            templateName = nodes[0].getTemplateName();
        }

        if (templateName == null) {
            // generate an HTML string for the nodes given and construct a fragment
            let html = "";
            let cleanNodes = new Array(nodes.length);
            for (let i = 0; i < nodes.length; i++) {
                // we only want to store non-virtual elements to generate from
                let node = nodes[i];
                node = qdInternal.dom.unwrap(node);

                // store the node in the cleaned up set
                cleanNodes[i] = node;

                // completely wipe all data from the node, we dont care about anything including virtual changes
                qdInternal.storage.clearValues(node);

                // append the outer html of the node
                html += node.outerHTML;
            }

            if (templateState.html[html] == null) {
                templateName = qdInternal.templates._uniqueId++;
                templateState.html[html] = templateName;
                templateState.nodes[templateName] = cleanNodes;
            } else {
                templateName = templateState.html[html];
            }
        }

        // add the given name as an alias to this info set
        if (name != null) {
            templateState.aliases[name] = templateName;
        }

        // return the given name or a generated name if no name given
        return name != null ? name : templateName;
    },

    unregister(name) {
        delete qdInternal.state.templates.aliases[name];
    },

    clearCache() {
        if (qdInternal.state.templates.cache != null) {
            qdInternal.state.templates.cache.clear();
        }
    }
};


qd.registerTemplate = function(name, templateNodes) {
    if (!(templateNodes instanceof Array)) {
        return qdInternal.errors.throw(new QuickdrawError("Nodes for template must be given as an array"));
    }

    return qdInternal.templates.register(templateNodes, name);
};

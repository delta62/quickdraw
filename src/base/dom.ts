import { enqueue as enqueueRender } from './renderer';
import { addEvents } from './eventing';
import { clearValues, getValue, setValue, getInternalValue, setInternalValue } from './storage';
import { throwError } from './errors';

/** The current unique identifier number */
let uniqueIdentifier = 0;

type ActionType = "insert" | "remove";

// Given a dom element, assigns a unique id to it if it doesn't
// have one already. The unique Id is then returned
// @param [DomElement] node the element to get the unique id of
// @return the unique node id
export function uniqueId(node: HTMLElement) {
    if (getInternalValue(node, 'id') == null) {
        setInternalValue(node, 'id', ++uniqueIdentifier);
    }
    return getInternalValue<number>(node, 'id');
}

// Takes the given dom tree and constructs a virtualized wrapper around
// it that can be traversed for bindings. This wrapper is used to allow
// bindings to quickly compute the updates they wish to apply and transparently
// apply changes to the dom nodes only after all bindings have been
// evaluated
export function virtualize(node: VirtualDomNode | HTMLElement): VirtualDomNode {
    // if the given node is a virtual node just return it
    if (node instanceof VirtualDomNode) return node;

    // return the currently defined virtual node for an element or create one if there isnt one
    return getInternalValue(node, 'virtual') || new VirtualDomNode(node);
}

// @return [Node] unwraps a virtual dom node returing the raw node it modifes
export function unwrap(node: VirtualDomNode | HTMLElement): Node | null {
    if (!node) return null;
    return node instanceof VirtualDomNode ? node.getRawNode() : node;
}

// Allows a DOM node to be pulled across documents within the virtual dom
// @param [Document] document the document that the node should be imported to
// @param [DomNode] node a node that should be imported to the given document
// @param [Boolean] deep whether or not the import should be done recursively
export function importNode(document: Document, node: HTMLElement, deep = true) {
    return virtualize(node).cloneNode(deep, document);
}

// A virtual dom node that wraps a real dom node allowing for changes
// to the dom node to be staged together before actually being made to
// the dom node. The state queried on this node is always up to date with
// the last changes made through this node, but a query on the raw node
// may result in a stale state if the changes have not been applied by
// the renderer yet. If you start interacting with a node through this
// class it is recommended that you should perform all interactions with
// the node through this class, otherwise race conditions may occur.
//
// Each method that can be used to mutate the state of the node is marked
// with a '@immediate' or '@delayed' symbol. Any method that mutates the
// raw node before returning is marked with '@immediate' while all methods
// that defer changes until a change application are marked with '@delayed'.
// Since the idea of this class is minimizing expensive DOM operations, the
// tags will be accompanied with the reasoning for it as well
export class VirtualDomNode {
    private static _uniqueId = 0;

    private _changes: {
        properties: Record<string, any> | null;
        attributes: Record<string, any> | null;
        styles: Record<string, any> | null;
        children: VirtualDomNode[] | null;
    };

    private _state: { id: number, rawNode: HTMLElement, hasModifications: boolean, templateName: string | null, parent?: VirtualDomNode | null };

    // Constructs a new virtual node wrapper around the given dom node
    // @param [Node] the dom node to wrap
    constructor(node: HTMLElement) {
        this._changes = {
            properties: null,
            attributes: null,
            styles: null,
            children: null
        };

        this._state = {
            id: VirtualDomNode._uniqueId++,
            rawNode: node,
            hasModifications: false,
            templateName: null
        };

        // associate the virtual node with the raw node
        setInternalValue(node, 'virtual', this);

        // add eventing to this object
        addEvents(this);

        // reset the change state to default
        this._resetChangeState();
    }

    /** Disposes of the entirerty of the virtual tree starting from this node */
    dispose() {
        // dispose all children
        if (this._changes.children) {
            for (let child of this._changes.children) {
                child.dispose();
            }
        }

        // reset changes to clear sub data properly
        this._resetChangeState();

        // delete the actual changes though
        delete this._changes;

        // disassociate this virtual node
        setInternalValue(this._state.rawNode, 'virtual', null);

        // delete the raw node reference
        return delete this._state.rawNode;
    }


    getUniqueId() {
        return this._state.id;
    }

    // @return [Node] the raw dom node this virtual node wraps
    getRawNode() {
        return this._state.rawNode;
    }

    // Takes all the changes that have been applied to this virtual node
    // and generates a patch object that can be applied by the renderer
    // @return [Object] an object describing the patches to apply to the real
    //                  node backing this virtual one.
    //                  Null if there are no patches to apply
    generatePatch() {
        // no patch for no modifications
        if (!this._state.hasModifications) { return null; }

        // generate patch set
        let patchSet = {
            node       : this._state.rawNode,
            properties : this._changes.properties,
            attributes : this._changes.attributes,
            styles     : this._changes.styles,
            children   : this._generateChildrenActions()
        };

        this._resetChangeState();

        return patchSet;
    }

    /**
     * @return the virtual dom node that is the parent of this node if there is one, null otherwise
     */
    getParentNode(): VirtualDomNode | null {
        // only add the parent if the state doesnt already have one defined
        // this is because we will set the parent to null to deleniate a child
        // removed from the dom tree virtually
        if (!this._state.hasOwnProperty('parent')) {
            let { rawNode } = this._state;
            if (rawNode.parentNode && rawNode.parentNode !== rawNode.ownerDocument) {
                this._state.parent = virtualize(rawNode.parentNode as HTMLElement);
            } else {
                this._state.parent = null;
            }
        }
        return this._state.parent as VirtualDomNode | null;
    }

    // Sets the given node to be the parent node of this node
    // @param [VirtualDomNode] a virtual dom node to set as this nodes parent
    // @param [Boolean] removeFromOldParent whether or not to remove this node from the old parent
    setParentNode(virtualNode: VirtualDomNode | null, removeFromOldParent = true) {
        if (!(virtualNode instanceof VirtualDomNode)) {
            throwError(new QuickdrawError("Attempting to set non-virtual node to parent of a virtual node"));
        }

        let curParent = this.getParentNode();
        // do nothing if the parent hasnt changed
        if (virtualNode === curParent) return;

        // remove this child from its current parent
        if (removeFromOldParent) {
            if (curParent) {
                curParent.removeChild(this);
            }
        }

        // store the new parent
        this._state.parent = virtualNode;
    }

    // Retrieves the template associated with the node.
    getTemplateName() {
        return this._state.templateName;
    }

    // Sets the template name for the node
    // @param [String] templateName The template this node is part of.
    setTemplateName(templateName: string) {
        return this._state.templateName = templateName;
    }

    // Retrieves a value from the node's quickdraw storage with the associated string
    // @param [String] key the name of the value to retrieve
    // @param [String] namespace (optional) the namespace to use in storage if not the default
    getValue(key: string, namespace?: string) {
        return getValue(this._state.rawNode, key, namespace);
    }

    // Stores a key/value pair in the node's quickdraw storage
    // @param [String] key the name of the value to store
    // @param [Mixed] value the value to store at the given key
    // @param [String] namespace (optional) the namespace to use in storage if not the default
    // @immediate this is setting a non-observed pure javascript value meaning there is
    //            no performance overhead outside of setting the actual value
    setValue(key: string, value: any, namespace?: string) {
        setValue(this._state.rawNode, key, value, namespace);
    }

    // Removes all quickdraw storage from the backing dom node
    clearValues() {
        // clear the storage
        clearValues(this._state.rawNode);

        // add this virtual node back to the dom node, only a dispose should disassociate it
        setInternalValue(this._state.rawNode, 'virtual', this);

    }

    // @param [String] name the name of the property to return
    // @return [Mixed] returns a property of the backing dom node that would normally be set
    //                 directly on the node with the dot operator
    getProperty(name: string) {
        return this._changes && this._changes.properties && this._changes.properties[name]
            ? this._changes.properties[name]
            : (this._state.rawNode as Record<string, any>)[name];
    }

    // Sets a property on the backing dom node that would normally be set directly on the node
    // @param [String] name the name of the property to set
    // @param [Mixed] value the value of the property to set
    // @delayed all properties are delayed as there is a mix of observed and unobserved properties
    //          on every DOM node and the observed ones could possibly trigger an expensive reflow
    setProperty(name: string, value: any) {
        this._changeWillOccur();
        if (!this._changes.properties) {
            this._changes.properties = { };
        }
        this._changes.properties[name] = value;
    }

    // @param [String] name the name of the attribute to get
    // @return [Mixed] returns an attribute set on the dom node
    getAttribute(name: string) {
        if (this._changes && this._changes.attributes && this._changes.attributes.hasOwnProperty(name)) {
            return this._changes.attributes[name];
        }
        return this._state.rawNode.getAttribute(name);
    }

    // @param [String] name the name of the attribute to set
    // @param [Mixed] value the value to set for the attribute
    // @delayed some engines listen to all attributes set on nodes and trigger special routines
    //          when specific attributes or values are set
    setAttribute(name: string, value: any) {
        this._changeWillOccur();
        if (!this._changes.attributes) {
            this._changes.attributes = { };
        }
        this._changes.attributes[name] = value;
    }

    // @param [String] name the name of the attribute to delete
    removeAttribute(name: string) {
        this._changeWillOccur();
        if (!this._changes.attributes) {
            this._changes.attributes = { };
        }
        delete this._changes.attributes[name];
    }

    // @param [String] name the name of the attribute to check
    hasAttribute(name: string) {
        if (this._changes.attributes && this._changes.attributes.hasOwnProperty(name)) {
            return this._changes.attributes[name] != null;
        }
        return this._state.rawNode.hasAttribute(name);
    }

    // @param [String] name the name of a css property to read from the node
    // @return [Mixed] the value associated with the given name in the css style
    //                 object for this node
    getStyle(name: string) {
        return this._changes && this._changes.styles && this._changes.styles[name]
            ? this._changes.styles[name]
            : this._state.rawNode.style[name as any];
    }

    // @param [String] name the name of a css property to set on the node
    // @param [Mixed] value the value to assign to the css property
    // @delayed any and all css style changes have the ability to trigger reflows
    setStyle(name: string, value: any) {
        this._changeWillOccur();
        if (!this._changes.styles) {
            this._changes.styles = { };
        }
        this._changes.styles[name] = value;
    }

    // Adds an event listener to the dom node
    // This method acts as a passthrough to the wrapped node
    // @immediate while event triggering has an overhead, there doesn't appear to be any large
    //            negative performance implications for adding/removing listeners
    addEventListener(...args: any[]) {
        return this._state.rawNode.addEventListener.apply(this._state.rawNode, args);
    }

    // Removes an event listener from the dom node
    // This method acts as a passthrough to the wrapped node
    // @immediate while event triggering has an overhead, there doesn't appear to be any large
    //            negative performance implications for adding/removing listeners
    removeEventListener(...args: any[]) {
        return this._state.rawNode.removeEventListener.apply(this._state.rawNode, args);
    }

    // Returns all of the current children of this node that would normally be
    // present in the 'children' array of the node but updated for any changes
    // @param [Boolean] copy if true then a copy of the internal array is returned
    // @return [VirtualDomNode[]] an array of virtual dom nodes that are the children of this node
    getChildren(copy = false) {
        this._generateVirtualChildren();

        if (!copy) {
            return this._changes.children;
        }

        // slice to return a copy
        return this._changes.children ? this._changes.children.slice() : [ ];
    }

    // @param [Mixed] a real or virtual node to determine if it is a child of this node
    // @return [Boolean] whether or not the given child is a child of this node
    isChild(child: HTMLElement | VirtualDomNode) {
        this._generateVirtualChildren();
        let virtualChild = virtualize(child);
        return this._changes.children ? this._changes.children.indexOf(virtualChild) > -1 : false;
    }

    // Removes the given child from the dom node and returns it
    // @param [Mixed] child the real or virtual dom node to remove from this node
    // @return [Node] the virtual child that has been removed
    // @throw [Exception] if the given child is not a child of this node
    removeChild(child: HTMLElement | VirtualDomNode) {
        this._generateVirtualChildren();

        // children will be modified
        this._changeWillOccur();

        let virtualChild = virtualize(child);
        let index = this._changes.children ? this._changes.children.indexOf(virtualChild) : -1;

        // error if the given child is not a child of this node
        if (index === -1) {
            return throwError(new QuickdrawError("Given element is not a child of this node"));
        }

        // otherwise remove the child from the children array and return the raw node
        this._changes.children!.splice(index, 1);

        // set the parent node to null but done remove from the parent again because thats us
        virtualChild.setParentNode(null, false);

        return virtualChild;
    }

    // Appends the given child to this dom node as the last child in this node
    // param [Mixed] child the child to add to this node
    appendChild(child: HTMLElement | VirtualDomNode): VirtualDomNode {
        this._generateVirtualChildren();

        // children will be modified
        this._changeWillOccur();

        let virtualChild = virtualize(child);
        let index = this._changes.children ? this._changes.children.indexOf(virtualChild) : -1;

        // special cases for when child already a child of this node
        if (index !== -1) {
            // return now if the child is already at the end
            if (index === this._changes.children!.length - 1) {
                return virtualChild;
            }

            // otherwise remove the child from the array
            this._changes.children!.splice(index, 1);
        }

        // now insert the child at the end of the array
        if (!this._changes.children) {
            this._changes.children = [ ];
        }
        this._changes.children.push(virtualChild);

        // set the virtual childs parent
        virtualChild.setParentNode(this);

        // return the newly appended virtual child
        return virtualChild;
    }

    // Inserts the given child before the reference child node
    // If the reference node is null this will act as append
    // @param [Mixed] child the child to add to this node
    // @param [Mixed] referenceNode the node to use as a reference point
    insertBefore(child: HTMLElement | VirtualDomNode, referenceNode: HTMLElement | VirtualDomNode) {
        this._generateVirtualChildren();

        // children will be modified
        this._changeWillOccur();

        if (referenceNode == null) {
            // if no reference node given, treat as append
            return this.appendChild(child);
        }

        let virtualChild = virtualize(child);
        let virtualReference = virtualize(referenceNode);

        let childIndex = this._changes.children ? this._changes.children.indexOf(virtualChild) : -1;
        let referenceIndex = this._changes.children ? this._changes.children.indexOf(virtualReference) : -1;
        // if the reference node is not actually a child of this node error out
        if (referenceIndex === -1) {
            return throwError(new QuickdrawError("Reference node is not a child of this node"));
        }

        // if the child is already a child of this node do some preprocessing
        if (childIndex !== -1) {
            // do nothing if the child is already in the right place
            if ((childIndex + 1) === referenceIndex) { return virtualChild; }

            // otherwise remove the child and recompute the reference index
            this._changes.children!.splice(childIndex, 1);
            referenceIndex = this._changes.children!.indexOf(virtualReference);
        }

        // insert the node before the reference node
        if (!this._changes.children) {
            this._changes.children = [ ];
        }
        this._changes.children.splice(referenceIndex, 0, virtualChild);

        // set the virtual childs parent
        virtualChild.setParentNode(this);

        // return the newly inserted virtual child
        return virtualChild;
    }

    // Removes all children from this dom node
    clearChildren() {
        this._generateVirtualChildren();

        // children will be modified
        this._changeWillOccur();

        if (this._changes.children) {
            for (let child of this._changes.children) {
                // set the parent to null, dont remove from parent since we are doing that now
                child.setParentNode(null, false);
            }
        }

        // erase all the children
        if (this._changes.children) {
            this._changes.children.length = 0;
        }
    }

    // Takes the given set of children and sets them to be this nodes children
    setChildren(children: (VirtualDomNode | HTMLElement)[]) {
        // clear out all of the children
        this.clearChildren();

        if (!this._changes.children) {
            this._changes.children = [ ];
        }

        // repopulate the child array with the given children
        for (let child of children) {
            let virtualChild = virtualize(child);
            virtualChild.setParentNode(this);
            this._changes.children.push(virtualChild);
        }
    }

    // Constructs a virtual clone tree that can be rendered to a full tree
    // @param [Boolean] deep whether or not the node should be recursively cloned
    // @param [Document] (optional) document the document that the cloned node should belong to
    cloneNode(deep = true, document = this._state.rawNode.ownerDocument) {
        // returns a clone of the virtual and any backing real nodes
        let copy, value;
        if (document === this._state.rawNode.ownerDocument) {
            copy = this._state.rawNode.cloneNode(false) as HTMLElement;
        } else {
            copy = document!.importNode(this._state.rawNode, false) as HTMLElement;
        }

        let virtualCopy = virtualize(copy);

        let changedProperty = false;
        if (this._changes.properties != null) {
            virtualCopy._changes.properties = {};
            for (let property in this._changes.properties) {
                value = this._changes.properties[property];
                changedProperty = true;
                virtualCopy._changes.properties[property] = value;
            }
        }

        if (this._changes.attributes != null) {
            virtualCopy._changes.attributes = {};
            for (let attribute in this._changes.attributes) {
                value = this._changes.attributes[attribute];
                changedProperty = true;
                virtualCopy._changes.attributes[attribute] = value;
            }
        }

        if (this._changes.styles != null) {
            virtualCopy._changes.styles = {};
            for (let style in this._changes.styles) {
                value = this._changes.styles[style];
                changedProperty = true;
                virtualCopy._changes.styles[style] = value;
            }
        }

        // since a property update must be applied, ensure enqueued for render
        if (changedProperty) {
            virtualCopy._changeWillOccur();
        }

        // if deep clone was requested we need to appropriately clone children
        if (deep && this._changes.children) {
            // generate our virtual children so we can clone
            this._generateVirtualChildren();

            // since this node and the children are clones we can attach the
            // children directly without worrying about style reflows
            for (let i = 0; i < this._changes.children.length; i++) {
                let child = this._changes.children[i];
                let newChild = child.cloneNode(true, document);
                copy.appendChild(newChild.getRawNode());
            }

            // however we need to ensure states are consistent so force the
            // virtual copy to generate its child array
            virtualCopy.getChildren();
        }

        return virtualCopy;
    }

    private _resetChangeState() {
        // reset the modifications flag back to false
        this._state.hasModifications = false;

        // delete the parent reference as we will want to take
        // the parent from the node when asked later
        delete this._state.parent;

        // reset the values within changes, we differ the creation
        // of any sub-objects until they are actually used to cut
        // down on the memory churn that can occur during updates
        this._changes.properties = null;
        this._changes.attributes = null;
        this._changes.styles = null;
        this._changes.children = null;
    }

    private _changeWillOccur() {
        if (!this._state.hasModifications) {
            this._state.hasModifications = true;

            // register node to be rendered
            enqueueRender(this);
        }

    }

    private _generateVirtualChildren() {
        if (this._changes.children) return;

        // generate a child array of virtual children to perform operations on
        this._changes.children = [ ];
        for (let i = 0; i < this._state.rawNode.children.length; i++) {
            let child = this._state.rawNode.children[i];
            let virtualChild = virtualize(child);
            virtualChild.setParentNode(this);
            this._changes.children.push(virtualChild);
        }
    }

    private _generateChildrenActions() {
        // if the children were not changed, nothing to do
        let child, curIndex, index, map, value;
        let asc, end;
        if (this._changes.children == null) { return []; }

        // otherwise we need to generate a diff between the current and expected child arrays
        let currentChildren = this._state.rawNode.children;
        let expectedChildren = new Array(this._changes.children.length);
        for (let i = 0; i < this._changes.children.length; i++) {
            child = this._changes.children[i];
            expectedChildren[i] = child.getRawNode();
        }

        let actions: { type: ActionType, value: any } = [];
        let prunedChildren = [];
        for (let i = 0; i < currentChildren.length; i++) {
            let child = currentChildren[i];
            if (!(__in__(child, expectedChildren))) {
                actions.push({
                    type: "remove",
                    value: child
                });
            } else {
                prunedChildren.push(child);
            }
        }

        let mappingArray = new Array(expectedChildren.length);
        for (index = 0; index < expectedChildren.length; index++) {
            var left, left1;
            value = expectedChildren[index];
            mappingArray[index] = {
                leads   : (left = expectedChildren[index + 1]) != null ? left : null,
                follows : (left1 = expectedChildren[index - 1]) != null ? left1 : null,
                value
            };
        }

        let actionsForward: { type: ActionType; value: any; follows?: any; }[]  = actions;
        let arrayForward = prunedChildren;
        let actionsBackward: { type: ActionType; value: any; leads?: any; }[] = actions.slice();
        let arrayBackward = prunedChildren.slice();

        // do the forward mapping
        for (index = 0; index < mappingArray.length; index++) {
            map = mappingArray[index];
            curIndex = arrayForward.indexOf(map.value);
            // if the time is already at the correct index just skip it
            if (curIndex === index) { continue; }

            if (curIndex !== -1) {
                // remove item from our logical array but dont specify an action since
                // the dom insertion will auto remove it
                arrayForward.splice(curIndex, 1);
            }

            actionsForward.push({
                type: "insert",
                value: map.value,
                follows: map.follows
            });
            arrayForward.splice(index, 0, map.value);
        }

        // do the backward mapping now, its a bit more complicated since the array size can change
        for (index = 0, end = mappingArray.length, asc = 0 <= end; asc ? index < end : index > end; asc ? index++ : index--) {
            map = mappingArray[mappingArray.length - 1 - index];

            curIndex = arrayBackward.indexOf(map.value);
            let correctIndex = Math.max(0, arrayBackward.length - 1 - index);

            // if the item is already in the correct position don't move it now
            if (correctIndex === curIndex) { continue; }

            if (curIndex !== -1) {
                // element exists in the array, remove it and again dont track the removal
                arrayBackward.splice(curIndex, 1);
            }

            if (map.leads === null) {
                correctIndex = arrayBackward.length;
            } else {
                correctIndex = arrayBackward.indexOf(map.leads);
            }

            actionsBackward.push({
                type: "insert",
                value: map.value,
                leads: map.leads
            });
            arrayBackward.splice(correctIndex, 0, map.value);
        }

        // return the action set that is shorter
        if (actionsForward.length > actionsBackward.length) { return actionsBackward; } else { return actionsForward; }
    }
}

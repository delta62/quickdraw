/** representation of the current state */
export interface QuickdrawState {
    current: CurrentState;
    binding: BindingState;
    error: ErrorState;
    updates: UpdateState;
    render: RenderState;
    templates: TemplateState;
}

/** the pieces currently in use for reference and snapshot */
export interface CurrentState {
    /** the model currently being bound */
    model: null;
    /** the element currently being bound */
    element: null;
    /** the handler currently being used in binding */
    handler: null;
}

export interface BindingState {
    /** a cache of parsed binding function strings */
    functions: Record<string, never>;
    /** the binding handlers that have been registered in the system */
    handlers: Record<string, never>;
    /** the order that handlers should be evaluated in */
    order: never[];
}

export interface ErrorState {
    /** the handlers registered to handle errors that the library may encounter */
    handlers: never[];
}

export interface UpdateState {
    /** the key to the currently schedule update timer */
    key: null;
    /** whether or not an immediate update has been set */
    immediate: boolean;
    /** dependency updates to process on next update */
    queue: never[];
}

export interface RenderState {
    /** the key to the currently scheduled render timer */
    key: null;
    /** an object of node ids to whether or not they are enqueued */
    enqueuedNodes: Record<string, never>;
    /** the current set of patches to apply to the dom */
    queue: never[];
}

export interface TemplateState {
    /** the cache that stores the current set of nodes */
    cache: null;
    /** the set of raw node templates used to make others */
    nodes: Record<string, never>;
    /** a map of aliases to template names */
    aliases: Record<string, never>;
    /** a map of raw html to the associate template names */
    html: Record<string, never>;
}

export const state: QuickdrawState = {
    current: {
        model: null,
        element: null,
        handler: null
    },
    binding: {
        functions: {},
        handlers: {},
        order: []
    },
    error: {
        handlers: []
    },
    updates: {
        key: null,
        immediate: false,
        queue: []
    },
    render: {
        key: null,
        enqueuedNodes: {},
        queue: []
    },
    templates: {
        cache: null,
        nodes: {},
        aliases: {},
        html: {}
    }
};
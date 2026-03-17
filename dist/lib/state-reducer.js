/**
 * LLMemory-Palace - State Reducer Module
 *
 * Redux-like reducer for managing palace state with immutable updates.
 * Handles scan lifecycle, file changes, pattern/flow registration, and state reset.
 *
 * @module state-reducer
 */

/**
 * Action types supported by the StateReducer
 * @enum {string}
 */
export const ActionTypes = {
    SCAN_START: 'SCAN_START',
    SCAN_COMPLETE: 'SCAN_COMPLETE',
    FILE_ADD: 'FILE_ADD',
    FILE_CHANGE: 'FILE_CHANGE',
    FILE_REMOVE: 'FILE_REMOVE',
    PATTERN_REGISTER: 'PATTERN_REGISTER',
    FLOW_REGISTER: 'FLOW_REGISTER',
    STATE_RESET: 'STATE_RESET'
};

/**
 * Default initial state for the reducer
 * @type {Object}
 */
const defaultInitialState = {
    isScanning: false,
    scanStartTime: null,
    scanEndTime: null,
    lastScanDuration: null,
    files: {},
    patterns: {},
    flows: {},
    metadata: {
        totalFiles: 0,
        totalPatterns: 0,
        totalFlows: 0,
        lastModified: null
    },
    errors: []
};

/**
 * Creates a deep clone of an object for immutable updates
 * @param {*} obj - Object to clone
 * @returns {*} Deep clone of the object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }
    const cloned = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
}

/**
 * Action handler for SCAN_START
 * @param {Object} state - Current state
 * @param {Object} action - Action with optional payload
 * @returns {Object} New state
 */
function handleScanStart(state, action) {
    return {
        ...state,
        isScanning: true,
        scanStartTime: action.payload?.startTime || Date.now(),
        scanEndTime: null,
        lastScanDuration: null,
        metadata: {
            ...state.metadata,
            lastModified: Date.now()
        }
    };
}

/**
 * Action handler for SCAN_COMPLETE
 * @param {Object} state - Current state
 * @param {Object} action - Action with optional payload
 * @returns {Object} New state
 */
function handleScanComplete(state, action) {
    const endTime = action.payload?.endTime || Date.now();
    const duration = state.scanStartTime ? endTime - state.scanStartTime : null;
    
    return {
        ...state,
        isScanning: false,
        scanEndTime: endTime,
        lastScanDuration: duration,
        metadata: {
            ...state.metadata,
            lastModified: Date.now()
        }
    };
}

/**
 * Action handler for FILE_ADD
 * @param {Object} state - Current state
 * @param {Object} action - Action with file payload
 * @returns {Object} New state
 */
function handleFileAdd(state, action) {
    const { path, ...fileData } = action.payload || {};
    
    if (!path) {
        return {
            ...state,
            errors: [...state.errors, { type: 'FILE_ADD', message: 'File path is required', timestamp: Date.now() }]
        };
    }
    
    const existingFiles = state.files || {};
    const isNewFile = !existingFiles[path];
    
    return {
        ...state,
        files: {
            ...existingFiles,
            [path]: {
                ...fileData,
                addedAt: Date.now(),
                status: 'added'
            }
        },
        metadata: {
            ...state.metadata,
            totalFiles: isNewFile ? (state.metadata.totalFiles || 0) + 1 : state.metadata.totalFiles,
            lastModified: Date.now()
        }
    };
}

/**
 * Action handler for FILE_CHANGE
 * @param {Object} state - Current state
 * @param {Object} action - Action with file payload
 * @returns {Object} New state
 */
function handleFileChange(state, action) {
    const { path, ...fileData } = action.payload || {};
    
    if (!path) {
        return {
            ...state,
            errors: [...state.errors, { type: 'FILE_CHANGE', message: 'File path is required', timestamp: Date.now() }]
        };
    }
    
    const existingFiles = state.files || {};
    const existingFile = existingFiles[path];
    
    return {
        ...state,
        files: {
            ...existingFiles,
            [path]: {
                ...existingFile,
                ...fileData,
                modifiedAt: Date.now(),
                status: 'modified'
            }
        },
        metadata: {
            ...state.metadata,
            lastModified: Date.now()
        }
    };
}

/**
 * Action handler for FILE_REMOVE
 * @param {Object} state - Current state
 * @param {Object} action - Action with path payload
 * @returns {Object} New state
 */
function handleFileRemove(state, action) {
    const { path } = action.payload || {};
    
    if (!path) {
        return {
            ...state,
            errors: [...state.errors, { type: 'FILE_REMOVE', message: 'File path is required', timestamp: Date.now() }]
        };
    }
    
    const existingFiles = state.files || {};
    const { [path]: removedFile, ...remainingFiles } = existingFiles;
    const fileExisted = !!removedFile;
    
    return {
        ...state,
        files: remainingFiles,
        metadata: {
            ...state.metadata,
            totalFiles: fileExisted ? Math.max(0, ((state.metadata || {}).totalFiles || 1) - 1) : (state.metadata || {}).totalFiles || 0,
            lastModified: Date.now()
        }
    };
}

/**
 * Action handler for PATTERN_REGISTER
 * @param {Object} state - Current state
 * @param {Object} action - Action with pattern payload
 * @returns {Object} New state
 */
function handlePatternRegister(state, action) {
    const { id, name, ...patternData } = action.payload || {};
    const patternId = id || name;
    
    if (!patternId) {
        return {
            ...state,
            errors: [...state.errors, { type: 'PATTERN_REGISTER', message: 'Pattern id or name is required', timestamp: Date.now() }]
        };
    }
    
    const existingPatterns = state.patterns || {};
    const isNewPattern = !existingPatterns[patternId];
    
    return {
        ...state,
        patterns: {
            ...existingPatterns,
            [patternId]: {
                ...patternData,
                id: patternId,
                name: name || patternId,
                registeredAt: Date.now()
            }
        },
        metadata: {
            ...state.metadata,
            totalPatterns: isNewPattern ? (state.metadata.totalPatterns || 0) + 1 : state.metadata.totalPatterns,
            lastModified: Date.now()
        }
    };
}

/**
 * Action handler for FLOW_REGISTER
 * @param {Object} state - Current state
 * @param {Object} action - Action with flow payload
 * @returns {Object} New state
 */
function handleFlowRegister(state, action) {
    const { id, name, ...flowData } = action.payload || {};
    const flowId = id || name;
    
    if (!flowId) {
        return {
            ...state,
            errors: [...state.errors, { type: 'FLOW_REGISTER', message: 'Flow id or name is required', timestamp: Date.now() }]
        };
    }
    
    const existingFlows = state.flows || {};
    const isNewFlow = !existingFlows[flowId];
    
    return {
        ...state,
        flows: {
            ...existingFlows,
            [flowId]: {
                ...flowData,
                id: flowId,
                name: name || flowId,
                registeredAt: Date.now()
            }
        },
        metadata: {
            ...state.metadata,
            totalFlows: isNewFlow ? (state.metadata.totalFlows || 0) + 1 : state.metadata.totalFlows,
            lastModified: Date.now()
        }
    };
}

/**
 * Action handler for STATE_RESET
 * @param {Object} state - Current state (unused, but kept for consistency)
 * @param {Object} action - Action with optional partial state payload
 * @param {Object} initialState - Initial state to reset to
 * @returns {Object} Reset state
 */
function handleStateReset(state, action, initialState) {
    const partialState = action.payload?.partialState || {};
    
    return {
        ...deepClone(initialState),
        ...partialState,
        metadata: {
            ...(initialState.metadata || {}),
            ...(partialState.metadata || {}),
            lastModified: Date.now()
        }
    };
}

/**
 * Action handlers map
 * @type {Object.<string, Function>}
 */
const actionHandlers = {
    [ActionTypes.SCAN_START]: handleScanStart,
    [ActionTypes.SCAN_COMPLETE]: handleScanComplete,
    [ActionTypes.FILE_ADD]: handleFileAdd,
    [ActionTypes.FILE_CHANGE]: handleFileChange,
    [ActionTypes.FILE_REMOVE]: handleFileRemove,
    [ActionTypes.PATTERN_REGISTER]: handlePatternRegister,
    [ActionTypes.FLOW_REGISTER]: handleFlowRegister,
    [ActionTypes.STATE_RESET]: handleStateReset
};

/**
 * Creates a reducer function with the given initial state
 * @param {Object} [initialState=defaultInitialState] - Initial state for the reducer
 * @returns {Function} Reducer function that takes state and action
 */
export function createReducer(initialState = defaultInitialState) {
    // Deep clone initial state to prevent mutations
    const state = deepClone(initialState);
    
    return function reducer(currentState = state, action) {
        if (!action || typeof action !== 'object') {
            return currentState;
        }
        
        const { type, payload } = action;
        const handler = actionHandlers[type];
        
        if (!handler) {
            // Unknown action type - return current state unchanged
            return currentState;
        }
        
        // Special handling for STATE_RESET which needs access to initial state
        if (type === ActionTypes.STATE_RESET) {
            return handleStateReset(currentState, { payload }, state);
        }
        
        return handler(currentState, { payload });
    };
}

/**
 * StateReducer class for object-oriented usage
 * Provides a simple interface for state management
 */
export class StateReducer {
    /**
     * Creates a new StateReducer instance
     * @param {Object} [initialState={}] - Initial state
     */
    constructor(initialState = {}) {
        const mergedInitialState = {
            ...defaultInitialState,
            ...initialState
        };
        this._initialState = deepClone(mergedInitialState);
        this._state = deepClone(mergedInitialState);
        this._reducer = createReducer(mergedInitialState);
    }
    
    /**
     * Reduces state based on action
     * @param {Object} action - Action object with type and optional payload
     * @returns {Object} New state
     */
    reduce(action) {
        this._state = this._reducer(this._state, action);
        return this._state;
    }
    
    /**
     * Gets current state
     * @returns {Object} Current state (immutable copy)
     */
    getState() {
        return deepClone(this._state);
    }
    
    /**
     * Sets new state (merges with existing)
     * @param {Object} newState - State to merge
     * @returns {Object} New state
     */
    setState(newState) {
        this._state = {
            ...this._state,
            ...newState,
            metadata: {
                ...(this._state.metadata || {}),
                ...(newState.metadata || {}),
                lastModified: Date.now()
            }
        };
        return this.getState();
    }
    
    /**
     * Resets state to initial state
     * @param {Object} [partialState={}] - Optional partial state to merge after reset
     * @returns {Object} Reset state
     */
    reset(partialState = {}) {
        this._state = this.reduce({
            type: ActionTypes.STATE_RESET,
            payload: { partialState }
        });
        return this.getState();
    }
    
    /**
     * Gets initial state
     * @returns {Object} Initial state (immutable copy)
     */
    getInitialState() {
        return deepClone(this._initialState);
    }
    
    /**
     * Dispatches an action (alias for reduce)
     * @param {Object} action - Action to dispatch
     * @returns {Object} New state
     */
    dispatch(action) {
        return this.reduce(action);
    }
}

export default StateReducer;

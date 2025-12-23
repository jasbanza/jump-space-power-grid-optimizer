/**
 * Build Management System
 * Handles CRUD operations for builds, state tracking, and persistence
 */

const STORAGE_KEY_BUILDS = 'jumpspace-builds';
const STORAGE_KEY_CURRENT_BUILD = 'jumpspace-current-build';

// Current working build
let currentBuild = null;

// Last saved state (for change detection)
let lastSavedState = null;

// Callbacks for UI updates
let onBuildChangeCallback = null;
let onSaveStateChangeCallback = null;

/**
 * Generate a unique ID for builds
 */
function generateId() {
    return 'build_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Initialize the build system
 * @param {Object} callbacks Callback functions for UI updates
 */
export function initBuilds(callbacks = {}) {
    onBuildChangeCallback = callbacks.onBuildChange || null;
    onSaveStateChangeCallback = callbacks.onSaveStateChange || null;
    
    // Try to load current build from localStorage
    const savedCurrentBuildId = localStorage.getItem(STORAGE_KEY_CURRENT_BUILD);
    
    if (savedCurrentBuildId) {
        const builds = getAllBuilds();
        currentBuild = builds.find(b => b.id === savedCurrentBuildId) || null;
        
        if (currentBuild) {
            lastSavedState = JSON.stringify(currentBuild.state);
        }
    }
    
    return currentBuild;
}

/**
 * Get all saved builds from localStorage
 * @returns {Array} Array of build objects
 */
export function getAllBuilds() {
    try {
        const data = localStorage.getItem(STORAGE_KEY_BUILDS);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Failed to load builds:', e);
        return [];
    }
}

/**
 * Save all builds to localStorage
 */
function saveAllBuilds(builds) {
    try {
        localStorage.setItem(STORAGE_KEY_BUILDS, JSON.stringify(builds));
    } catch (e) {
        console.error('Failed to save builds:', e);
    }
}

/**
 * Get the current working build
 * @returns {Object|null} Current build or null
 */
export function getCurrentBuild() {
    return currentBuild;
}

/**
 * Create a new unnamed build with initial state
 * @param {Object} initialState Initial build state
 * @returns {Object} The new build
 */
export function createUnnamedBuild(initialState) {
    currentBuild = {
        id: generateId(),
        name: null, // null = unnamed
        isSaved: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        state: initialState
    };
    
    lastSavedState = null; // No saved state for new builds
    
    // Don't add to builds list until named
    localStorage.setItem(STORAGE_KEY_CURRENT_BUILD, currentBuild.id);
    
    notifySaveStateChange();
    
    return currentBuild;
}

/**
 * Save the current build with a name
 * @param {string} name Build name
 * @param {Object} state Current build state
 * @returns {Object} The saved build
 */
export function saveBuild(name, state) {
    if (!currentBuild) {
        currentBuild = {
            id: generateId(),
            createdAt: Date.now()
        };
    }
    
    currentBuild.name = name;
    currentBuild.isSaved = true;
    currentBuild.updatedAt = Date.now();
    currentBuild.savedAt = new Date().toISOString();
    currentBuild.state = state;
    
    // Add to or update in builds list
    const builds = getAllBuilds();
    const existingIndex = builds.findIndex(b => b.id === currentBuild.id);
    
    if (existingIndex >= 0) {
        builds[existingIndex] = currentBuild;
    } else {
        builds.push(currentBuild);
    }
    
    saveAllBuilds(builds);
    localStorage.setItem(STORAGE_KEY_CURRENT_BUILD, currentBuild.id);
    
    lastSavedState = JSON.stringify(state);
    
    notifySaveStateChange();
    
    return currentBuild;
}

/**
 * Quick save - save current state to existing build
 * @param {Object} state Current build state
 * @returns {boolean} Success
 */
export function quickSave(state) {
    if (!currentBuild || !currentBuild.name) {
        return false; // Can't quick save unnamed build
    }
    
    currentBuild.updatedAt = Date.now();
    currentBuild.savedAt = new Date().toISOString();
    currentBuild.state = state;
    
    const builds = getAllBuilds();
    const existingIndex = builds.findIndex(b => b.id === currentBuild.id);
    
    if (existingIndex >= 0) {
        builds[existingIndex] = currentBuild;
        saveAllBuilds(builds);
    }
    
    lastSavedState = JSON.stringify(state);
    
    notifySaveStateChange();
    
    return true;
}

/**
 * Quick load - reload from last saved state
 * @returns {Object|null} The saved state or null
 */
export function quickLoad() {
    if (!currentBuild || !lastSavedState) {
        return null;
    }
    
    try {
        currentBuild.state = JSON.parse(lastSavedState);
        currentBuild.updatedAt = Date.now();
        
        notifySaveStateChange();
        notifyBuildChange();
        
        return currentBuild.state;
    } catch (e) {
        console.error('Failed to quick load:', e);
        return null;
    }
}

/**
 * Load a build by ID
 * @param {string} buildId Build ID
 * @returns {Object|null} The loaded build or null
 */
export function loadBuild(buildId) {
    const builds = getAllBuilds();
    const build = builds.find(b => b.id === buildId);
    
    if (!build) return null;
    
    currentBuild = { ...build };
    lastSavedState = JSON.stringify(build.state);
    
    localStorage.setItem(STORAGE_KEY_CURRENT_BUILD, buildId);
    
    notifySaveStateChange();
    notifyBuildChange();
    
    return currentBuild;
}

/**
 * Delete a build by ID
 * @param {string} buildId Build ID
 * @returns {boolean} Success
 */
export function deleteBuild(buildId) {
    const builds = getAllBuilds();
    const index = builds.findIndex(b => b.id === buildId);
    
    if (index < 0) return false;
    
    builds.splice(index, 1);
    saveAllBuilds(builds);
    
    // If deleting current build, clear it
    if (currentBuild && currentBuild.id === buildId) {
        currentBuild = null;
        lastSavedState = null;
        localStorage.removeItem(STORAGE_KEY_CURRENT_BUILD);
        notifyBuildChange();
    }
    
    return true;
}

/**
 * Delete the current unsaved build
 */
export function deleteCurrentUnsaved() {
    if (currentBuild && !currentBuild.isSaved) {
        currentBuild = null;
        lastSavedState = null;
        localStorage.removeItem(STORAGE_KEY_CURRENT_BUILD);
        notifyBuildChange();
        notifySaveStateChange();
    }
}

/**
 * Rename a build
 * @param {string} buildId Build ID
 * @param {string} newName New name
 * @returns {boolean} Success
 */
export function renameBuild(buildId, newName) {
    const builds = getAllBuilds();
    const build = builds.find(b => b.id === buildId);
    
    if (!build) return false;
    
    build.name = newName;
    build.updatedAt = Date.now();
    
    saveAllBuilds(builds);
    
    if (currentBuild && currentBuild.id === buildId) {
        currentBuild.name = newName;
    }
    
    return true;
}

/**
 * Check if a build name is unique
 * @param {string} name Name to check
 * @param {string} excludeId Build ID to exclude (for renaming)
 * @returns {boolean} True if unique
 */
export function isNameUnique(name, excludeId = null) {
    const builds = getAllBuilds();
    const normalizedName = name.toLowerCase().trim();
    
    return !builds.some(b => 
        b.name && 
        b.name.toLowerCase().trim() === normalizedName && 
        b.id !== excludeId
    );
}

/**
 * Check if current build has unsaved changes
 * @param {Object} currentState Current state to compare
 * @returns {boolean} True if there are unsaved changes
 */
export function hasUnsavedChanges(currentState) {
    if (!currentBuild) return false;
    if (!currentBuild.isSaved || !currentBuild.name) return true;
    if (!lastSavedState) return true;
    
    return JSON.stringify(currentState) !== lastSavedState;
}

/**
 * Check if current build is unnamed
 * @returns {boolean} True if unnamed
 */
export function isCurrentBuildUnsaved() {
    return currentBuild && (!currentBuild.isSaved || !currentBuild.name);
}

/**
 * Update the current build state (marks as having changes)
 * @param {Object} state New state
 */
export function updateCurrentState(state) {
    if (!currentBuild) {
        createUnnamedBuild(state);
    } else {
        currentBuild.state = state;
        currentBuild.updatedAt = Date.now();
        notifySaveStateChange();
    }
}

/**
 * Get the save state indicator
 * @param {Object} currentState Current state to compare
 * @returns {Object} { isSaved, isNamed, hasChanges }
 */
export function getSaveState(currentState) {
    if (!currentBuild) {
        return { isSaved: true, isNamed: true, hasChanges: false };
    }
    
    const isNamed = !!currentBuild.name;
    const hasChanges = hasUnsavedChanges(currentState);
    const isSaved = isNamed && !hasChanges;
    
    return { isSaved, isNamed, hasChanges };
}

// URL encoding/decoding for sharing

/**
 * Export a build to a shareable URL
 * @param {Object} state Build state to encode
 * @returns {string} Full URL with encoded build
 */
export function exportToURL(state) {
    try {
        const json = JSON.stringify(state);
        const encoded = btoa(encodeURIComponent(json));
        const url = new URL(window.location.href);
        url.hash = 'b=' + encoded;
        return url.toString();
    } catch (e) {
        console.error('Failed to export to URL:', e);
        return null;
    }
}

/**
 * Import a build from URL hash
 * @returns {Object|null} Decoded build state or null
 */
export function importFromURL() {
    try {
        const hash = window.location.hash;
        if (!hash || !hash.startsWith('#b=')) return null;
        
        const encoded = hash.substring(3);
        const json = decodeURIComponent(atob(encoded));
        return JSON.parse(json);
    } catch (e) {
        console.error('Failed to import from URL:', e);
        return null;
    }
}

/**
 * Clear the URL hash
 */
export function clearURLHash() {
    history.replaceState(null, '', window.location.pathname + window.location.search);
}

// Notification helpers

function notifyBuildChange() {
    if (onBuildChangeCallback) {
        onBuildChangeCallback(currentBuild);
    }
}

function notifySaveStateChange() {
    if (onSaveStateChangeCallback) {
        onSaveStateChangeCallback(currentBuild);
    }
}



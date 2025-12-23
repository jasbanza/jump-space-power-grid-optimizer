/**
 * UI Event Handlers and Rendering for Power Grid Optimizer
 */

import { 
    getGridState, getGridSize, toggleCell, clearGrid, 
    setSolution, getSolution, clearSolution, setGridFromTemplate,
    addManualPlacement, removeManualPlacement, getManualPlacements, 
    clearManualPlacements, getManuallyOccupiedCells,
    setAllSolutions, getAllSolutions, clearAllSolutions
} from './grid.js';
import { getComponents, countCells, getAllRotations, getOccupiedCells } from './components.js';
import { solve } from './solver.js';
import { 
    getReactorList, getAuxGeneratorList, combineGrid, getGridStats 
} from './templates.js';
import {
    initBuilds, getAllBuilds, getCurrentBuild, createUnnamedBuild,
    saveBuild, quickSave, quickLoad, loadBuild, deleteBuild,
    deleteCurrentUnsaved, isNameUnique, hasUnsavedChanges,
    isCurrentBuildUnsaved, updateCurrentState, getSaveState,
    exportToURL, importFromURL, clearURLHash
} from './builds.js';
import {
    initDialogs, showDialog, showPromptDialog, showToast,
    confirmDestructive, showInfo, showError
} from './dialogs.js';

// Track component tier quantities: Map<"componentId_tier", quantity>
const componentQuantities = new Map();

// Priority list: Array of {id, componentId, tier}
let priorityList = [];
let priorityIdCounter = 0;

// Filter state
let nameFilter = '';
let blocksFilter = null;
let tierFilters = new Set(); // Multiple tiers can be selected; empty = all tiers

// Expanded categories (only one at a time)
let expandedCategory = null;

// Expanded component accordions
const expandedComponents = new Set();

// Current grid configuration with tiers
let currentReactor = '';
let currentReactorTier = '1';
let currentAux1 = 'none';
let currentAux1Tier = '1';
let currentAux2 = 'none';
let currentAux2Tier = '1';

// Track which priority items are placed in the solution
let placedPriorityIds = new Set();

// Track which placements are invalid (for manual drag-drop that failed validation)
let invalidPlacements = new Set();

// LocalStorage keys for persistence
const STORAGE_KEY_CONFIG = 'jumpspace-grid-config';
const STORAGE_KEY_COMPONENTS = 'jumpspace-components';
const STORAGE_KEY_PRIORITY = 'jumpspace-priority';

/**
 * Save grid configuration (reactor/aux selections) to localStorage
 */
function saveGridConfig() {
    try {
        const config = {
            reactor: { id: currentReactor, tier: currentReactorTier },
            aux1: { id: currentAux1, tier: currentAux1Tier },
            aux2: { id: currentAux2, tier: currentAux2Tier }
        };
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) {
        console.warn('Could not save grid config to localStorage:', e);
    }
}

/**
 * Save component quantities to localStorage
 */
function saveComponents() {
    try {
        const quantities = {};
        componentQuantities.forEach((qty, key) => {
            quantities[key] = qty;
        });
        localStorage.setItem(STORAGE_KEY_COMPONENTS, JSON.stringify({ quantities }));
    } catch (e) {
        console.warn('Could not save components to localStorage:', e);
    }
}

/**
 * Save priority list to localStorage
 */
function savePriorityList() {
    try {
        const data = {
            list: priorityList,
            counter: priorityIdCounter
        };
        localStorage.setItem(STORAGE_KEY_PRIORITY, JSON.stringify(data));
    } catch (e) {
        console.warn('Could not save priority list to localStorage:', e);
    }
}

/**
 * Load all saved state from localStorage
 */
function loadSavedState() {
    // Load grid config
    try {
        const configStr = localStorage.getItem(STORAGE_KEY_CONFIG);
        if (configStr) {
            const config = JSON.parse(configStr);
            if (config.reactor) {
                currentReactor = config.reactor.id || '';
                currentReactorTier = config.reactor.tier || '1';
            }
            if (config.aux1) {
                currentAux1 = config.aux1.id || 'none';
                currentAux1Tier = config.aux1.tier || '1';
            }
            if (config.aux2) {
                currentAux2 = config.aux2.id || 'none';
                currentAux2Tier = config.aux2.tier || '1';
            }
        }
    } catch (e) {
        console.warn('Could not load grid config from localStorage:', e);
    }

    // Load component quantities
    try {
        const compStr = localStorage.getItem(STORAGE_KEY_COMPONENTS);
        if (compStr) {
            const data = JSON.parse(compStr);
            if (data.quantities) {
                componentQuantities.clear();
                for (const [key, qty] of Object.entries(data.quantities)) {
                    componentQuantities.set(key, qty);
                }
            }
        }
    } catch (e) {
        console.warn('Could not load components from localStorage:', e);
    }

    // Load priority list
    try {
        const priorityStr = localStorage.getItem(STORAGE_KEY_PRIORITY);
        if (priorityStr) {
            const data = JSON.parse(priorityStr);
            if (data.list) {
                priorityList = data.list;
            }
            if (typeof data.counter === 'number') {
                priorityIdCounter = data.counter;
            }
        }
    } catch (e) {
        console.warn('Could not load priority list from localStorage:', e);
    }
}

/**
 * Clear all persisted state from localStorage
 */
function clearAllPersistedState() {
    try {
        localStorage.removeItem(STORAGE_KEY_CONFIG);
        localStorage.removeItem(STORAGE_KEY_COMPONENTS);
        localStorage.removeItem(STORAGE_KEY_PRIORITY);
    } catch (e) {
        console.warn('Could not clear localStorage:', e);
    }
}

/**
 * Initialize the UI
 */
// ============================================
// Build Management Functions
// ============================================

/**
 * Get current build state for saving
 */
function getCurrentBuildState() {
    return {
        gridConfig: {
            reactor: currentReactor,
            reactorTier: currentReactorTier,
            aux1: currentAux1,
            aux1Tier: currentAux1Tier,
            aux2: currentAux2,
            aux2Tier: currentAux2Tier
        },
        priorityList: [...priorityList],
        componentQuantities: Object.fromEntries(componentQuantities),
        manualPlacements: getManualPlacements(),
        solution: getSolution()
    };
}

/**
 * Apply a build state to the UI
 */
function applyBuildState(state) {
    if (!state) return;
    
    // Apply grid config
    if (state.gridConfig) {
        currentReactor = state.gridConfig.reactor || '';
        currentReactorTier = state.gridConfig.reactorTier || '1';
        currentAux1 = state.gridConfig.aux1 || 'none';
        currentAux1Tier = state.gridConfig.aux1Tier || '1';
        currentAux2 = state.gridConfig.aux2 || 'none';
        currentAux2Tier = state.gridConfig.aux2Tier || '1';
    }
    
    // Apply priority list
    if (state.priorityList) {
        priorityList = [...state.priorityList];
        // Update priorityIdCounter to be higher than any existing id
        for (const item of priorityList) {
            const num = parseInt(item.id.replace('priority_', ''), 10);
            if (!isNaN(num) && num >= priorityIdCounter) {
                priorityIdCounter = num + 1;
            }
        }
    }
    
    // Apply component quantities
    if (state.componentQuantities) {
        componentQuantities.clear();
        for (const [key, qty] of Object.entries(state.componentQuantities)) {
            componentQuantities.set(key, qty);
        }
    }
    
    // Apply manual placements
    clearManualPlacements();
    if (state.manualPlacements) {
        for (const placement of state.manualPlacements) {
            addManualPlacement(placement);
        }
    }
    
    // Apply solution
    clearSolution();
    if (state.solution) {
        setSolution(state.solution);
        placedPriorityIds.clear();
        for (const placement of state.solution) {
            if (placement.priorityId) {
                placedPriorityIds.add(placement.priorityId);
            }
        }
    }
    
    // Apply grid config to grid
    if (currentReactor) {
        applyGridConfig();
    }
    
    // Save to localStorage for next load
    saveGridConfig();
    saveComponents();
    savePriorityList();
}

/**
 * Handle build change callback
 */
function handleBuildChange(build) {
    if (build && build.state) {
        applyBuildState(build.state);
    }
    renderGrid();
    renderComponents();
    renderGridConfig();
    renderPriorityList();
    renderBuildSelector();
}

/**
 * Update save state indicator
 */
function updateSaveIndicator() {
    const indicator = document.getElementById('build-save-indicator');
    const saveBtn = document.getElementById('build-save-btn');
    const reloadBtn = document.getElementById('build-reload-btn');
    const deleteBtn = document.getElementById('build-delete-btn');
    
    if (!indicator) return;
    
    const currentState = getCurrentBuildState();
    const saveState = getSaveState(currentState);
    const build = getCurrentBuild();
    
    // Update indicator
    indicator.classList.remove('saved', 'unsaved', 'unnamed');
    
    if (!build || !build.name) {
        indicator.textContent = '●';
        indicator.title = 'Unsaved new build';
        indicator.classList.add('unnamed');
    } else if (saveState.hasChanges) {
        indicator.textContent = '●';
        indicator.title = 'Unsaved changes';
        indicator.classList.add('unsaved');
    } else {
        indicator.textContent = '✓';
        indicator.title = 'All changes saved';
        indicator.classList.add('saved');
    }
    
    // Update button states
    if (saveBtn) {
        saveBtn.disabled = !build && !currentReactor;
    }
    if (reloadBtn) {
        reloadBtn.disabled = !build || !build.name || !saveState.hasChanges;
    }
    if (deleteBtn) {
        deleteBtn.disabled = !build;
    }
    
    // Show/hide unnamed build prompt
    updateUnnamedBuildPrompt();
}

/**
 * Update unnamed build prompt visibility
 */
let showUnnamedPrompt = false;

function updateUnnamedBuildPrompt() {
    const prompt = document.getElementById('unnamed-build-prompt');
    if (!prompt) return;
    
    const build = getCurrentBuild();
    const shouldShow = showUnnamedPrompt && build && !build.name;
    
    if (shouldShow) {
        prompt.classList.remove('hidden');
    } else {
        prompt.classList.add('hidden');
    }
}

/**
 * Render build selector dropdown
 */
/**
 * Format datetime for display
 */
function formatBuildDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
           ', ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Render the custom build selector dropdown
 */
function renderBuildSelector() {
    const toggle = document.getElementById('build-dropdown-toggle');
    const menu = document.getElementById('build-dropdown-menu');
    if (!toggle || !menu) return;
    
    const builds = getAllBuilds();
    const currentBuild = getCurrentBuild();
    
    // Update toggle text
    const textEl = toggle.querySelector('.build-dropdown-text');
    if (textEl) {
        textEl.textContent = currentBuild ? (currentBuild.name || 'Unnamed') : 'New Build';
    }
    
    // Build menu items
    menu.innerHTML = '';
    
    // New Build option
    const newBuildItem = document.createElement('div');
    newBuildItem.className = 'build-dropdown-item' + (!currentBuild ? ' selected' : '');
    newBuildItem.dataset.buildId = '';
    newBuildItem.innerHTML = `
        <div class="build-dropdown-item-content">
            <span class="build-dropdown-item-name">+ New Build</span>
        </div>
    `;
    menu.appendChild(newBuildItem);
    
    if (builds.length > 0) {
        // Divider
        const divider = document.createElement('div');
        divider.className = 'build-dropdown-divider';
        menu.appendChild(divider);
        
        // Existing builds
        for (const build of builds) {
            const isSelected = currentBuild && currentBuild.id === build.id;
            const item = document.createElement('div');
            item.className = 'build-dropdown-item' + (isSelected ? ' selected' : '');
            item.dataset.buildId = build.id;
            
            const dateStr = formatBuildDate(build.savedAt);
            
            item.innerHTML = `
                <div class="build-dropdown-item-content">
                    <span class="build-dropdown-item-name">${build.name || 'Unnamed'}</span>
                    ${dateStr ? `<span class="build-dropdown-item-date">${dateStr}</span>` : ''}
                </div>
                <div class="build-dropdown-item-actions">
                    <button class="build-clone-btn" data-clone-id="${build.id}" title="Clone this build">📋</button>
                </div>
            `;
            menu.appendChild(item);
        }
    }
}

/**
 * Setup build-related event listeners
 */
function setupBuildEventListeners() {
    // Custom Build Dropdown
    const dropdown = document.getElementById('build-dropdown');
    const toggle = document.getElementById('build-dropdown-toggle');
    const menu = document.getElementById('build-dropdown-menu');
    
    if (toggle && menu && dropdown) {
        // Toggle dropdown
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });
        
        // Handle item selection and clone clicks
        menu.addEventListener('click', async (e) => {
            // Handle clone button clicks
            const cloneBtn = e.target.closest('.build-clone-btn');
            if (cloneBtn) {
                e.stopPropagation();
                const buildId = cloneBtn.dataset.cloneId;
                await handleCloneBuild(buildId);
                return;
            }
            
            // Handle item selection
            const item = e.target.closest('.build-dropdown-item');
            if (!item) return;
            
            const buildId = item.dataset.buildId;
            
            // Check for unsaved changes
            const currentBuild = getCurrentBuild();
            const currentState = getCurrentBuildState();
            if (currentBuild && hasUnsavedChanges(currentState)) {
                const confirmed = await confirmDestructive(
                    'Unsaved Changes',
                    'You have unsaved changes. Do you want to discard them?',
                    'Discard'
                );
                if (!confirmed) {
                    dropdown.classList.remove('open');
                    return;
                }
            }
            
            dropdown.classList.remove('open');
            
            if (!buildId) {
                // New build
                deleteCurrentUnsaved();
                currentReactor = '';
                currentReactorTier = '1';
                currentAux1 = 'none';
                currentAux1Tier = '1';
                currentAux2 = 'none';
                currentAux2Tier = '1';
                priorityList = [];
                componentQuantities.clear();
                clearManualPlacements();
                clearSolution();
                clearAllSolutions();
                placedPriorityIds.clear();
                invalidPlacements.clear();
                
                applyGridConfig();
                renderGrid();
                renderComponents();
                renderGridConfig();
                renderPriorityList();
                updateSolutionDropdown([]);
                updateSaveIndicator();
                renderBuildSelector();
            } else {
                loadBuild(buildId);
            }
        });
    }
    
    // Save button
    const saveBtn = document.getElementById('build-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleSaveClick);
    }
    
    // Reload button
    const reloadBtn = document.getElementById('build-reload-btn');
    if (reloadBtn) {
        reloadBtn.addEventListener('click', handleReloadClick);
    }
    
    // Share button
    const shareBtn = document.getElementById('build-share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', handleShareClick);
    }
    
    // Screenshot button
    const screenshotBtn = document.getElementById('build-screenshot-btn');
    if (screenshotBtn) {
        screenshotBtn.addEventListener('click', handleScreenshotClick);
    }
    
    // Delete button
    const deleteBtn = document.getElementById('build-delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDeleteClick);
    }
    
    // Unnamed build prompt buttons
    const unnamedSaveBtn = document.getElementById('unnamed-save-btn');
    const unnamedDeleteBtn = document.getElementById('unnamed-delete-btn');
    const unnamedCancelBtn = document.getElementById('unnamed-cancel-btn');
    const buildNameInput = document.getElementById('build-name-input');
    
    if (buildNameInput) {
        buildNameInput.addEventListener('input', () => {
            const name = buildNameInput.value.trim();
            const errorSpan = document.getElementById('build-name-error');
            const saveBtn = document.getElementById('unnamed-save-btn');
            
            let error = null;
            if (!name) {
                error = '';
            } else if (!isNameUnique(name)) {
                error = 'A build with this name already exists';
            }
            
            if (errorSpan) errorSpan.textContent = error || '';
            if (saveBtn) saveBtn.disabled = !name || !!error;
        });
    }
    
    if (unnamedSaveBtn) {
        unnamedSaveBtn.addEventListener('click', () => {
            const name = buildNameInput?.value.trim();
            if (name && isNameUnique(name)) {
                const state = getCurrentBuildState();
                saveBuild(name, state);
                showUnnamedPrompt = false;
                renderBuildSelector();
                updateSaveIndicator();
                showToast('Build saved!', 'success');
            }
        });
    }
    
    if (unnamedDeleteBtn) {
        unnamedDeleteBtn.addEventListener('click', async () => {
            const confirmed = await confirmDestructive(
                'Delete Unsaved Build',
                'This will delete the current unsaved build and clear all settings.',
                'Delete'
            );
            if (confirmed) {
                deleteCurrentUnsaved();
                showUnnamedPrompt = false;
                
                // Reset everything
                currentReactor = '';
                currentReactorTier = '1';
                currentAux1 = 'none';
                currentAux1Tier = '1';
                currentAux2 = 'none';
                currentAux2Tier = '1';
                priorityList = [];
                componentQuantities.clear();
                clearManualPlacements();
                clearSolution();
                clearAllSolutions();
                placedPriorityIds.clear();
                invalidPlacements.clear();
                
                applyGridConfig();
                renderGrid();
                renderComponents();
                renderGridConfig();
                renderPriorityList();
                renderBuildSelector();
                updateSolutionDropdown([]);
                updateSaveIndicator();
                showToast('Build deleted', 'info');
            }
        });
    }
    
    if (unnamedCancelBtn) {
        unnamedCancelBtn.addEventListener('click', () => {
            showUnnamedPrompt = false;
            updateUnnamedBuildPrompt();
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+S to save
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            handleSaveClick();
        }
    });
}

/**
 * Handle clone build
 */
async function handleCloneBuild(buildId) {
    const builds = getAllBuilds();
    const build = builds.find(b => b.id === buildId);
    
    if (!build || !build.state) {
        showToast('Failed to clone build', 'error');
        return;
    }
    
    // Generate timestamp name
    const now = new Date();
    const timestamp = now.toLocaleString([], { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric', 
        minute: '2-digit'
    });
    const cloneName = `Clone_${timestamp}`;
    
    // Save the clone with the source build's state
    saveBuild(cloneName, build.state);
    
    showToast(`Cloned as "${cloneName}"`, 'success');
    renderBuildSelector();
    
    // Close dropdown
    const dropdown = document.getElementById('build-dropdown');
    if (dropdown) dropdown.classList.remove('open');
}

/**
 * Handle save button click
 */
async function handleSaveClick() {
    const build = getCurrentBuild();
    const state = getCurrentBuildState();
    
    if (build && build.name) {
        // Quick save
        quickSave(state);
        showToast('Build saved!', 'success');
        renderBuildSelector();
        updateSaveIndicator();
    } else {
        // Need to name the build
        showUnnamedPrompt = true;
        updateUnnamedBuildPrompt();
        
        // Focus the input
        const input = document.getElementById('build-name-input');
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}

/**
 * Handle reload button click
 */
async function handleReloadClick() {
    const build = getCurrentBuild();
    if (!build || !build.name) return;
    
    const confirmed = await confirmDestructive(
        'Reload Build',
        `Discard unsaved changes and reload "${build.name}" from its last saved state?`,
        'Reload'
    );
    
    if (confirmed) {
        const state = quickLoad();
        if (state) {
            applyBuildState(state);
            renderGrid();
            renderComponents();
            renderGridConfig();
            renderPriorityList();
            updateSaveIndicator();
            showToast('Build reloaded', 'info');
        }
    }
}

/**
 * Handle share button click
 */
function handleShareClick() {
    const state = getCurrentBuildState();
    const url = exportToURL(state);
    
    if (url) {
        navigator.clipboard.writeText(url).then(() => {
            showToast('Link copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Failed to copy link', 'error');
        });
    }
}

/**
 * Handle screenshot button click
 */
async function handleScreenshotClick() {
    // Check if html2canvas is available, if not, load it
    if (typeof html2canvas === 'undefined') {
        try {
            // Dynamically load html2canvas from CDN
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        } catch (e) {
            showToast('Failed to load screenshot library', 'error');
            return;
        }
    }
    
    try {
        const gridSection = document.querySelector('.grid-section');
        if (!gridSection) {
            showToast('Could not find grid section', 'error');
            return;
        }
        
        const canvas = await html2canvas(gridSection, {
            backgroundColor: '#1a1a2e',
            scale: 2
        });
        
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `power-grid-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Screenshot saved!', 'success');
        });
    } catch (e) {
        console.error('Screenshot failed:', e);
        showToast('Screenshot failed', 'error');
    }
}

/**
 * Load a script dynamically
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Handle delete button click
 */
async function handleDeleteClick() {
    const build = getCurrentBuild();
    if (!build) return;
    
    const name = build.name || 'this unsaved build';
    const confirmed = await confirmDestructive(
        'Delete Build',
        `Are you sure you want to delete "${name}"? This cannot be undone.`,
        `Delete "${name}"`
    );
    
    if (confirmed) {
        if (build.id) {
            deleteBuild(build.id);
        } else {
            deleteCurrentUnsaved();
        }
        
        // Reset everything
        currentReactor = '';
        currentReactorTier = '1';
        currentAux1 = 'none';
        currentAux1Tier = '1';
        currentAux2 = 'none';
        currentAux2Tier = '1';
        priorityList = [];
        componentQuantities.clear();
        clearManualPlacements();
        clearSolution();
        clearAllSolutions();
        placedPriorityIds.clear();
        invalidPlacements.clear();
        
        applyGridConfig();
        renderGrid();
        renderComponents();
        renderGridConfig();
        renderPriorityList();
        renderBuildSelector();
        updateSolutionDropdown([]);
        updateSaveIndicator();
        showToast('Build deleted', 'info');
    }
}

/**
 * Mark build as having changes (creates unnamed build if needed)
 */
function markBuildChanged() {
    const build = getCurrentBuild();
    const state = getCurrentBuildState();
    
    if (!build && currentReactor) {
        // First change with no build - create unnamed build
        createUnnamedBuild(state);
    } else if (build) {
        updateCurrentState(state);
    }
    
    updateSaveIndicator();
}

export function initUI() {
    // Initialize dialog system
    initDialogs();
    
    // Initialize builds system
    initBuilds({
        onBuildChange: handleBuildChange,
        onSaveStateChange: updateSaveIndicator
    });
    
    // Check for build in URL
    const urlBuild = importFromURL();
    if (urlBuild) {
        applyBuildState(urlBuild);
        clearURLHash();
        showToast('Build loaded from shared link', 'success');
    } else {
        // Load saved state before rendering
        loadSavedState();
    }
    
    // Apply grid config if we have a saved reactor
    if (currentReactor) {
        applyGridConfig();
    }
    
    renderGrid();
    renderComponents();
    renderGridConfig();
    renderPriorityList();
    renderBuildSelector();
    updateSaveIndicator();
    setupEventListeners();
    setupBuildEventListeners();
}

// Track expanded power selector categories
let expandedPowerCategory = null;

/**
 * Render the grid configuration with accordion-style selectors
 */
function renderGridConfig() {
    const reactors = getReactorList();
    const auxGenerators = getAuxGeneratorList();
    
    // Render reactor accordion
    renderPowerAccordion('reactor-accordion-container', 'Reactor', reactors, currentReactor, currentReactorTier, 'reactor');
    
    // Render aux generator accordions (disabled if no reactor selected)
    const auxDisabled = !currentReactor;
    renderPowerAccordion('aux1-accordion-container', 'Aux Generator 1', auxGenerators, currentAux1, currentAux1Tier, 'aux1', auxDisabled);
    renderPowerAccordion('aux2-accordion-container', 'Aux Generator 2', auxGenerators, currentAux2, currentAux2Tier, 'aux2', auxDisabled);
    
    updateGridStats();
}

/**
 * Render a power selector accordion (reactor or aux generator)
 */
function renderPowerAccordion(containerId, label, items, selectedId, selectedTier, type, disabled = false) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    // Find selected item for display
    const selectedItem = items.find(i => i.id === selectedId && i.tier === selectedTier);
    const hasSelection = selectedItem && selectedId !== 'none' && selectedId !== '';
    
    // Determine if this category is expanded
    const isExpanded = expandedPowerCategory === type;
    
    // Create category header
    const header = document.createElement('div');
    header.className = 'power-category';
    if (isExpanded) header.classList.add('expanded');
    if (hasSelection) header.classList.add('has-selection');
    if (disabled) header.classList.add('disabled');
    
    const toggle = document.createElement('span');
    toggle.className = 'power-category-toggle';
    toggle.textContent = '▶';
    
    const nameEl = document.createElement('span');
    nameEl.className = 'power-category-name';
    nameEl.textContent = label;
    
    const selectionEl = document.createElement('span');
    selectionEl.className = 'power-category-selection';
    if (disabled) {
        selectionEl.textContent = 'Select reactor first';
    } else if (hasSelection) {
        selectionEl.textContent = selectedItem.displayName;
    } else if (type.startsWith('aux')) {
        selectionEl.textContent = 'None';
    } else {
        selectionEl.textContent = 'Not selected';
    }
    
    header.appendChild(toggle);
    header.appendChild(nameEl);
    header.appendChild(selectionEl);
    
    // Click to expand/collapse
    if (!disabled) {
        header.addEventListener('click', () => {
            if (expandedPowerCategory === type) {
                expandedPowerCategory = null;
            } else {
                expandedPowerCategory = type;
            }
            renderGridConfig();
        });
    }
    
    container.appendChild(header);
    
    // Create content wrapper
    const content = document.createElement('div');
    content.className = 'power-category-content';
    
    // Create options
    for (const item of items) {
        const option = document.createElement('div');
        option.className = 'power-option';
        if (item.id === selectedId && item.tier === selectedTier) {
            option.classList.add('selected');
        }
        option.dataset.id = item.id;
        option.dataset.tier = item.tier;
        
        // Grid preview
        if (item.grid && item.id !== 'none') {
            const preview = createGridPreview(item.grid);
            option.appendChild(preview);
        }
        
        // Info
        const info = document.createElement('div');
        info.className = 'power-option-info';
        
        const name = document.createElement('div');
        name.className = 'power-option-name';
        name.textContent = item.displayName;
        
        const stats = document.createElement('div');
        stats.className = 'power-option-stats';
        if (item.id === 'none') {
            stats.textContent = 'No power';
        } else {
            stats.textContent = `${item.powerGeneration} power (${item.protectedPower} protected)`;
        }
        
        info.appendChild(name);
        info.appendChild(stats);
        option.appendChild(info);
        
        // Click handler
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            handlePowerSelect(type, item.id, item.tier);
        });
        
        content.appendChild(option);
    }
    
    container.appendChild(content);
}

/**
 * Create a grid preview element
 */
function createGridPreview(grid) {
    const preview = document.createElement('div');
    preview.className = 'power-option-preview';
    preview.style.gridTemplateColumns = `repeat(${grid[0].length}, 6px)`;
    preview.style.gridTemplateRows = `repeat(${grid.length}, 6px)`;
    
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const cell = document.createElement('div');
            cell.className = 'power-option-preview-cell';
            const value = grid[row][col];
            if (value === 1) {
                cell.classList.add('protected');
            } else if (value === 0) {
                cell.classList.add('powered');
            } else {
                cell.classList.add('empty');
            }
            preview.appendChild(cell);
        }
    }
    
    return preview;
}

/**
 * Handle power selector selection
 */
function handlePowerSelect(type, id, tier) {
    if (type === 'reactor') {
        currentReactor = id;
        currentReactorTier = tier;
    } else if (type === 'aux1') {
        currentAux1 = id;
        currentAux1Tier = tier;
    } else if (type === 'aux2') {
        currentAux2 = id;
        currentAux2Tier = tier;
    }
    
    // Collapse the category after selection
    expandedPowerCategory = null;
    
    // Save grid config to localStorage
    saveGridConfig();
    
    // Mark build as changed
    markBuildChanged();
    
    renderGridConfig();
    applyGridConfig();
}

/**
 * Update grid stats display
 */
function updateGridStats() {
    const statsEl = document.getElementById('grid-stats');
    
    if (!currentReactor) {
        statsEl.textContent = 'Select a reactor to configure your power grid';
        return;
    }
    
    const stats = getGridStats(currentReactor, currentReactorTier, currentAux1, currentAux1Tier, currentAux2, currentAux2Tier);
    statsEl.innerHTML = `
        <span class="stat">Total: <strong>${stats.total}</strong></span>
        <span class="stat protected">Protected: <strong>${stats.protected}</strong></span>
        <span class="stat unprotected">Unprotected: <strong>${stats.unprotected}</strong></span>
    `;
}

/**
 * Apply current grid configuration
 */
function applyGridConfig() {
    if (!currentReactor) return;
    
    const grid = combineGrid(currentReactor, currentReactorTier, currentAux1, currentAux1Tier, currentAux2, currentAux2Tier);
    setGridFromTemplate(grid);
    clearSolution();
    placedPriorityIds.clear();
    renderGrid();
    renderPriorityList();
    updateGridStats();
}

/**
 * Render the grid
 */
export function renderGrid() {
    const container = document.getElementById('grid-container');
    const gridState = getGridState();
    const gridSize = getGridSize();
    const solution = getSolution();
    
    // Build a map of placed components for quick lookup
    const placedCellsMap = new Map();
    const componentBounds = new Map(); // Track bounding boxes for labels
    
    // Track which components have at least one protected cell
    const componentsOnProtected = new Set();
    
    solution.forEach((placement) => {
        const priorityId = placement.priorityId;
        let minRow = Infinity, maxRow = -1, minCol = Infinity, maxCol = -1;
        let hasProtectedCell = false;
        
        for (const cell of placement.cells) {
            // Check if this cell is on a protected (blue) square
            if (gridState[cell.row][cell.col] === 1) {
                hasProtectedCell = true;
            }
            
            minRow = Math.min(minRow, cell.row);
            maxRow = Math.max(maxRow, cell.row);
            minCol = Math.min(minCol, cell.col);
            maxCol = Math.max(maxCol, cell.col);
        }
        
        // Track which components have protected cells
        if (hasProtectedCell) {
            componentsOnProtected.add(priorityId);
        }
        
        for (const cell of placement.cells) {
            const key = `${cell.row},${cell.col}`;
            placedCellsMap.set(key, {
                priorityId: priorityId,
                componentName: placement.componentName || placement.pieceName,
                hasProtectedCell: hasProtectedCell
            });
        }
        
        componentBounds.set(priorityId, {
            minRow, maxRow, minCol, maxCol,
            name: placement.componentName || placement.pieceName,
            hasProtectedCell: hasProtectedCell
        });
    });
    
    // Store for use by priority list rendering
    window._componentsOnProtected = componentsOnProtected;
    
    container.innerHTML = '';
    
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const cellValue = gridState[row][col];
            if (cellValue === 1) {
                cell.classList.add('protected');
            } else if (cellValue === 0) {
                cell.classList.add('powered');
            }
            
            // Add component overlay if this cell has a placed component
            const key = `${row},${col}`;
            if (placedCellsMap.has(key)) {
                const componentInfo = placedCellsMap.get(key);
                cell.classList.add('has-piece');
                cell.dataset.priorityId = componentInfo.priorityId;
                
                const overlay = document.createElement('div');
                overlay.className = 'piece-overlay';
                overlay.dataset.priorityId = componentInfo.priorityId;
                overlay.title = componentInfo.componentName;
                
                // Add protected class if component has at least one cell on a protected (blue) square
                if (componentInfo.hasProtectedCell) {
                    overlay.classList.add('protected-component');
                }
                
                // Check neighbors for border visibility (only show borders on outer edges)
                const topKey = `${row-1},${col}`;
                const bottomKey = `${row+1},${col}`;
                const leftKey = `${row},${col-1}`;
                const rightKey = `${row},${col+1}`;
                
                const topNeighbor = placedCellsMap.get(topKey);
                const bottomNeighbor = placedCellsMap.get(bottomKey);
                const leftNeighbor = placedCellsMap.get(leftKey);
                const rightNeighbor = placedCellsMap.get(rightKey);
                
                // Add classes for internal edges (same component neighbor = no border needed)
                if (topNeighbor && topNeighbor.priorityId === componentInfo.priorityId) {
                    overlay.classList.add('no-border-top');
                }
                if (bottomNeighbor && bottomNeighbor.priorityId === componentInfo.priorityId) {
                    overlay.classList.add('no-border-bottom');
                }
                if (leftNeighbor && leftNeighbor.priorityId === componentInfo.priorityId) {
                    overlay.classList.add('no-border-left');
                }
                if (rightNeighbor && rightNeighbor.priorityId === componentInfo.priorityId) {
                    overlay.classList.add('no-border-right');
                }
                
                // Hover events for grid-to-priority highlighting
                const priorityId = componentInfo.priorityId;
                overlay.addEventListener('mouseenter', () => {
                    highlightGridCells(priorityId);
                    highlightPriorityItem(priorityId);
                });
                overlay.addEventListener('mouseleave', () => {
                    unhighlightGridCells(priorityId);
                    unhighlightPriorityItem(priorityId);
                });
                
                cell.appendChild(overlay);
            }
            
            container.appendChild(cell);
        }
    }
    
    // Add labels for each placed component (positioned within bounding box)
    for (const [priorityId, bounds] of componentBounds) {
        const label = document.createElement('div');
        label.className = 'piece-label';
        label.dataset.priorityId = priorityId;
        label.draggable = true;
        label.style.cursor = 'grab';
        
        // Calculate position and size to fit within the shape bounds
        const cellSize = 42; // grid cell size + gap
        const shapeWidth = (bounds.maxCol - bounds.minCol + 1) * cellSize;
        const shapeHeight = (bounds.maxRow - bounds.minRow + 1) * cellSize;
        
        label.style.top = `${bounds.minRow * cellSize + 2}px`;
        label.style.left = `${bounds.minCol * cellSize + 2}px`;
        label.style.width = `${shapeWidth - 4}px`;
        label.style.height = `${shapeHeight - 4}px`;
        
        const name = bounds.name;
        label.textContent = name;
        label.title = `${name} - Drag to reposition`;
        
        // Drag handlers for repositioning on grid
        label.addEventListener('dragstart', (e) => {
            handleGridPieceDragStart(e, priorityId, bounds.minRow, bounds.minCol);
        });
        label.addEventListener('dragend', handleGridPieceDragEnd);
        
        container.appendChild(label);
    }
    
    // Add invalid-placement class to overlays that are in invalid positions
    if (invalidPlacements.size > 0) {
        for (const priorityId of invalidPlacements) {
            const overlays = container.querySelectorAll(`.piece-overlay[data-priority-id="${priorityId}"]`);
            overlays.forEach(o => o.classList.add('invalid-placement'));
        }
    }
}

/**
 * Render the priority list
 */
function renderPriorityList() {
    const container = document.getElementById('priority-list');
    container.innerHTML = '';
    
    // Set up drop zone for component drag-and-drop
    container.addEventListener('dragover', handleComponentDragOver);
    container.addEventListener('dragleave', handleComponentDragLeave);
    container.addEventListener('drop', handleComponentDrop);
    
    if (priorityList.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'priority-empty';
        empty.textContent = 'Drag components here or use quantity inputs';
        container.appendChild(empty);
        return;
    }
    
    const components = getComponents();
    
    for (const item of priorityList) {
        const component = components[item.componentId];
        if (!component || !component.tiers[item.tier]) continue;
        
        const tierData = component.tiers[item.tier];
        const isPlaced = placedPriorityIds.has(item.id);
        
        const div = document.createElement('div');
        div.className = 'priority-item';
        div.dataset.priorityId = item.id;
        div.draggable = true;
        
        if (isPlaced) {
            div.classList.add('placed');
            // Only show blue border if component has at least one cell on a protected (blue) square
            if (window._componentsOnProtected && window._componentsOnProtected.has(item.id)) {
                div.classList.add('protected-placed');
            }
        } else if (placedPriorityIds.size > 0) {
            // Only mark as not-placed if solver has run
            div.classList.add('not-placed');
        }
        
        // Drag handle
        const handle = document.createElement('span');
        handle.className = 'priority-drag-handle';
        handle.textContent = '≡';
        
        // Preview (use rotated shape if rotation is set)
        const rotations = getAllRotations(tierData.shape);
        const rotationIndex = item.rotation || 0;
        const rotatedShape = rotations[rotationIndex % rotations.length];
        const preview = createSmallShapePreview(rotatedShape);
        preview.className = 'priority-preview';
        
        // Info
        const info = document.createElement('div');
        info.className = 'priority-info';
        
        const name = document.createElement('div');
        name.className = 'priority-name';
        name.textContent = component.name;
        
        const tier = document.createElement('div');
        tier.className = 'priority-tier';
        tier.textContent = `Mk ${item.tier}`;
        
        info.appendChild(name);
        info.appendChild(tier);
        
        // Rotate button
        const rotate = document.createElement('button');
        rotate.className = 'priority-btn priority-rotate';
        rotate.textContent = '🔄';
        rotate.title = 'Rotate component';
        rotate.addEventListener('click', (e) => {
            e.stopPropagation();
            rotateComponent(item.id);
        });
        
        // Unplace button (remove from grid but keep in list)
        const unplace = document.createElement('button');
        unplace.className = 'priority-btn priority-unplace';
        unplace.textContent = '↩️';
        unplace.title = 'Remove from grid';
        unplace.disabled = !isPlaced;
        unplace.addEventListener('click', (e) => {
            e.stopPropagation();
            unplaceComponent(item.id);
        });
        
        // Delete button (remove from list entirely)
        const remove = document.createElement('button');
        remove.className = 'priority-btn priority-remove';
        remove.textContent = '🗑️';
        remove.title = 'Delete from build';
        remove.addEventListener('click', (e) => {
            e.stopPropagation();
            removePriorityItem(item.id);
        });
        
        div.appendChild(handle);
        div.appendChild(preview);
        div.appendChild(info);
        div.appendChild(rotate);
        div.appendChild(unplace);
        div.appendChild(remove);
        
        // Drag events
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragend', handleDragEnd);
        div.addEventListener('dragover', handleDragOver);
        div.addEventListener('drop', handleDrop);
        div.addEventListener('dragleave', handleDragLeave);
        
        // Hover events for highlighting (both grid and list item)
        div.addEventListener('mouseenter', () => {
            highlightGridCells(item.id);
            highlightPriorityItem(item.id);
        });
        div.addEventListener('mouseleave', () => {
            unhighlightGridCells(item.id);
            unhighlightPriorityItem(item.id);
        });
        
        container.appendChild(div);
    }
}

/**
 * Create a small shape preview for priority list
 */
function createSmallShapePreview(shape) {
    const preview = document.createElement('div');
    preview.style.display = 'inline-grid';
    preview.style.gap = '1px';
    preview.style.backgroundColor = 'var(--border-color)';
    preview.style.padding = '1px';
    preview.style.borderRadius = '2px';
    preview.style.gridTemplateColumns = `repeat(${shape[0].length}, 8px)`;
    preview.style.gridTemplateRows = `repeat(${shape.length}, 8px)`;
    
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            const cell = document.createElement('div');
            cell.className = 'priority-preview-cell';
            cell.classList.add(shape[row][col] ? 'filled' : 'empty');
            preview.appendChild(cell);
        }
    }
    
    return preview;
}

// Drag and drop handlers
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    
    // Also enable grid placement drag
    handleGridDragStart(e, e.target);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.priority-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    draggedItem = null;
    
    // Clean up grid drag state
    handleGridDragEnd();
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('.priority-item');
    if (target && target !== draggedItem) {
        target.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const target = e.target.closest('.priority-item');
    if (target) {
        target.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    const target = e.target.closest('.priority-item');
    if (!target || target === draggedItem) return;
    
    target.classList.remove('drag-over');
    
    const draggedId = draggedItem.dataset.priorityId;
    const targetId = target.dataset.priorityId;
    
    const draggedIndex = priorityList.findIndex(p => p.id === draggedId);
    const targetIndex = priorityList.findIndex(p => p.id === targetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = priorityList.splice(draggedIndex, 1);
        priorityList.splice(targetIndex, 0, removed);
        savePriorityList();
        renderPriorityList();
    }
}

// Component drag-to-add handlers
function handleComponentDragOver(e) {
    // Check if this is a component being dragged from the components section
    try {
        const types = e.dataTransfer.types;
        if (types.includes('application/json')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            document.getElementById('priority-list').classList.add('drop-target');
        }
    } catch (err) {
        // Ignore errors during drag
    }
}

function handleComponentDragLeave(e) {
    // Only remove if leaving the container entirely
    const container = document.getElementById('priority-list');
    if (!container.contains(e.relatedTarget)) {
        container.classList.remove('drop-target');
    }
}

function handleComponentDrop(e) {
    e.preventDefault();
    document.getElementById('priority-list').classList.remove('drop-target');
    
    try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        if (data.type === 'component') {
            const { componentId, tier } = data;
            const key = `${componentId}_${tier}`;
            const currentQty = componentQuantities.get(key) || 0;
            const newQty = currentQty + 1;
            
            // Update quantity
            componentQuantities.set(key, newQty);
            
            // Sync priority list
            syncPriorityList(componentId, tier, newQty);
            
            // Re-render components to update the quantity display
            renderComponents();
            
            // Clear solution since components changed
            clearSolution();
            placedPriorityIds.clear();
        }
    } catch (err) {
        console.warn('Could not process drop:', err);
    }
}

/**
 * Remove an item from priority list
 */
function removePriorityItem(id) {
    const item = priorityList.find(p => p.id === id);
    if (!item) return;
    
    priorityList = priorityList.filter(p => p.id !== id);
    
    // Update quantities
    const key = `${item.componentId}_${item.tier}`;
    const currentQty = componentQuantities.get(key) || 0;
    if (currentQty > 1) {
        componentQuantities.set(key, currentQty - 1);
    } else {
        componentQuantities.delete(key);
    }
    
    // Save to localStorage
    savePriorityList();
    saveComponents();
    
    renderComponents();
    renderPriorityList();
}

/**
 * Rotate a component in the priority list
 */
function rotateComponent(id) {
    const item = priorityList.find(p => p.id === id);
    if (!item) return;
    
    // Initialize rotation if not set
    if (typeof item.rotation === 'undefined') {
        item.rotation = 0;
    }
    
    // Cycle through 0, 1, 2, 3 (representing 0°, 90°, 180°, 270°)
    item.rotation = (item.rotation + 1) % 4;
    
    // Save to localStorage
    savePriorityList();
    
    // Re-render to show updated preview
    renderPriorityList();
    
    // If this component is placed, we need to clear the solution
    // since the rotation changed
    if (placedPriorityIds.has(id)) {
        clearSolution();
        clearManualPlacements();
        clearAllSolutions();
        placedPriorityIds.clear();
        renderGrid();
        updateSolutionDropdown([]);
        updateStatus('Rotation changed - run solver again', 'info');
    }
}

/**
 * Unplace a component from the grid (keep in My Components list)
 */
function unplaceComponent(id) {
    if (!placedPriorityIds.has(id)) return;
    
    // Remove from placed set
    placedPriorityIds.delete(id);
    
    // Remove from solution
    const solution = getSolution();
    const updatedSolution = solution.filter(p => p.priorityId !== id);
    setSolution(updatedSolution);
    
    // Remove from manual placements if it was there
    removeManualPlacement(id);
    
    // Remove from invalid placements if it was there
    invalidPlacements.delete(id);
    
    // Re-render
    renderGrid();
    renderPriorityList();
    updateGridStatus();
    
    markBuildChanged();
}

/**
 * Sync priority list with component quantities
 */
function syncPriorityList(componentId, tier, newQty) {
    const key = `${componentId}_${tier}`;
    const currentItems = priorityList.filter(p => p.componentId === componentId && p.tier === tier);
    const currentCount = currentItems.length;
    
    if (newQty > currentCount) {
        // Add new items
        for (let i = 0; i < newQty - currentCount; i++) {
            priorityList.push({
                id: `priority-${priorityIdCounter++}`,
                componentId,
                tier
            });
        }
    } else if (newQty < currentCount) {
        // Remove items from the end
        const toRemove = currentCount - newQty;
        let removed = 0;
        for (let i = priorityList.length - 1; i >= 0 && removed < toRemove; i--) {
            if (priorityList[i].componentId === componentId && priorityList[i].tier === tier) {
                priorityList.splice(i, 1);
                removed++;
            }
        }
    }
    
    // Save to localStorage
    savePriorityList();
    saveComponents();
    
    renderPriorityList();
}

/**
 * Highlight grid cells for a priority item
 */
function highlightGridCells(priorityId) {
    const overlays = document.querySelectorAll(`.piece-overlay[data-priority-id="${priorityId}"]`);
    overlays.forEach(o => o.classList.add('highlighted'));
    
    const labels = document.querySelectorAll(`.piece-label[data-priority-id="${priorityId}"]`);
    labels.forEach(l => l.style.fontWeight = 'bold');
}

/**
 * Unhighlight grid cells
 */
function unhighlightGridCells(priorityId) {
    const overlays = document.querySelectorAll(`.piece-overlay[data-priority-id="${priorityId}"]`);
    overlays.forEach(o => o.classList.remove('highlighted'));
    
    const labels = document.querySelectorAll(`.piece-label[data-priority-id="${priorityId}"]`);
    labels.forEach(l => l.style.fontWeight = '');
}

/**
 * Highlight priority item from grid hover
 */
function highlightPriorityItem(priorityId) {
    const item = document.querySelector(`.priority-item[data-priority-id="${priorityId}"]`);
    if (item) {
        item.classList.add('highlighted');
    }
}

/**
 * Unhighlight priority item
 */
function unhighlightPriorityItem(priorityId) {
    const item = document.querySelector(`.priority-item[data-priority-id="${priorityId}"]`);
    if (item) {
        item.classList.remove('highlighted');
    }
}

// ============================================
// GRID DRAG-AND-DROP FOR MANUAL PLACEMENT
// ============================================

// State for grid drag-drop
let gridDragData = null;  // { priorityId, componentId, tier, shape, rotations, currentRotation }
let gridDragHighlightedCells = [];

/**
 * Handle dragstart on priority items for grid placement
 */
function handleGridDragStart(e, priorityItem) {
    const priorityId = priorityItem.dataset.priorityId;
    const item = priorityList.find(p => p.id === priorityId);
    if (!item) return;
    
    const components = getComponents();
    const component = components[item.componentId];
    if (!component || !component.tiers[item.tier]) return;
    
    const tierData = component.tiers[item.tier];
    const rotations = getAllRotations(tierData.shape);
    
    // Start with the item's stored rotation (from rotate button)
    const initialRotation = item.rotation || 0;
    
    gridDragData = {
        priorityId,
        componentId: item.componentId,
        tier: item.tier,
        componentName: component.name,
        rotations,
        currentRotation: initialRotation,
        shape: rotations[initialRotation % rotations.length]
    };
    
    e.dataTransfer.setData('text/plain', 'grid-placement');
    e.dataTransfer.effectAllowed = 'move';
}

/**
 * Rotate the currently dragged component (called on R key)
 */
function rotateGridDrag() {
    if (!gridDragData) return;
    
    gridDragData.currentRotation = (gridDragData.currentRotation + 1) % gridDragData.rotations.length;
    gridDragData.shape = gridDragData.rotations[gridDragData.currentRotation];
    
    // Also update the priority item's stored rotation
    const item = priorityList.find(p => p.id === gridDragData.priorityId);
    if (item) {
        item.rotation = gridDragData.currentRotation;
        savePriorityList();
        // Update the preview in the list
        renderPriorityList();
    }
    
    // Re-highlight with new rotation if we have a cached position
    if (gridDragHighlightedCells.length > 0) {
        // Find the top-left of current highlight
        const container = document.getElementById('grid-container');
        const cells = container.querySelectorAll('.grid-cell');
        if (cells.length > 0) {
            const firstHighlighted = gridDragHighlightedCells[0];
            if (firstHighlighted) {
                updateGridDragHighlight(firstHighlighted.row, firstHighlighted.col);
            }
        }
    }
}

/**
 * Update grid cell highlighting during drag
 */
function updateGridDragHighlight(startRow, startCol) {
    clearGridDragHighlight();
    
    if (!gridDragData) return;
    
    const gridState = getGridState();
    const gridSize = getGridSize();
    const shape = gridDragData.shape;
    const occupiedCells = getManuallyOccupiedCells();
    
    // Also mark cells from current solver solution as occupied (except for this component)
    const solution = getSolution();
    for (const placement of solution) {
        if (placement.priorityId !== gridDragData.priorityId) {
            for (const cell of placement.cells) {
                occupiedCells.add(`${cell.row},${cell.col}`);
            }
        }
    }
    
    const cells = getOccupiedCells(shape, startRow, startCol);
    let allValid = true;
    
    gridDragHighlightedCells = [];
    
    for (const cell of cells) {
        const { row, col } = cell;
        
        // Check bounds
        if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
            allValid = false;
            continue;
        }
        
        const cellElement = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
        if (!cellElement) continue;
        
        const cellValue = gridState[row][col];
        const isOccupied = occupiedCells.has(`${row},${col}`);
        const isPowered = cellValue === 0 || cellValue === 1;
        const isProtected = cellValue === 1;
        
        gridDragHighlightedCells.push({ row, col, element: cellElement });
        
        if (!isPowered || isOccupied) {
            cellElement.classList.add('drag-invalid');
            allValid = false;
        } else if (isProtected) {
            cellElement.classList.add('drag-protected');
        } else {
            cellElement.classList.add('drag-valid');
        }
    }
    
    return allValid;
}

/**
 * Clear all grid drag highlighting
 */
function clearGridDragHighlight() {
    for (const { element } of gridDragHighlightedCells) {
        element.classList.remove('drag-valid', 'drag-protected', 'drag-invalid');
    }
    gridDragHighlightedCells = [];
}

/**
 * Flash cells red to indicate invalid drop
 */
function flashInvalidCells(cells) {
    for (const { element } of cells) {
        element.classList.add('flash-invalid');
        setTimeout(() => {
            element.classList.remove('flash-invalid');
        }, 450);
    }
}

/**
 * Get grid cell position from mouse event
 */
function getGridCellFromEvent(e) {
    const container = document.getElementById('grid-container');
    const rect = container.getBoundingClientRect();
    const cellSize = 42; // 40px cell + 2px gap
    
    const x = e.clientX - rect.left - 2; // Account for padding
    const y = e.clientY - rect.top - 2;
    
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    
    const gridSize = getGridSize();
    if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
        return null;
    }
    
    return { row, col };
}

/**
 * Handle dragover on grid container
 */
function handleGridDragOver(e) {
    if (!gridDragData) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const pos = getGridCellFromEvent(e);
    if (!pos) {
        clearGridDragHighlight();
        return;
    }
    
    updateGridDragHighlight(pos.row, pos.col);
}

/**
 * Handle dragleave on grid container
 */
function handleGridDragLeave(e) {
    const container = document.getElementById('grid-container');
    if (!container.contains(e.relatedTarget)) {
        clearGridDragHighlight();
    }
}

/**
 * Handle drop on grid container
 */
function handleGridDrop(e) {
    e.preventDefault();
    
    if (!gridDragData) {
        clearGridDragHighlight();
        return;
    }
    
    const pos = getGridCellFromEvent(e);
    if (!pos) {
        clearGridDragHighlight();
        gridDragData = null;
        return;
    }
    
    const gridState = getGridState();
    const gridSize = getGridSize();
    const shape = gridDragData.shape;
    const cells = getOccupiedCells(shape, pos.row, pos.col);
    const occupiedCells = getManuallyOccupiedCells();
    
    // Also check solver solution cells (except this component)
    const solution = getSolution();
    for (const placement of solution) {
        if (placement.priorityId !== gridDragData.priorityId) {
            for (const cell of placement.cells) {
                occupiedCells.add(`${cell.row},${cell.col}`);
            }
        }
    }
    
    // Validate all cells
    let allValid = true;
    for (const cell of cells) {
        if (cell.row < 0 || cell.row >= gridSize || cell.col < 0 || cell.col >= gridSize) {
            allValid = false;
            break;
        }
        const cellValue = gridState[cell.row][cell.col];
        const isPowered = cellValue === 0 || cellValue === 1;
        const isOccupied = occupiedCells.has(`${cell.row},${cell.col}`);
        
        if (!isPowered || isOccupied) {
            allValid = false;
            break;
        }
    }
    
    if (!allValid) {
        // Flash red and reject
        flashInvalidCells(gridDragHighlightedCells);
        clearGridDragHighlight();
        gridDragData = null;
        return;
    }
    
    // Valid drop - create placement
    const placement = {
        priorityId: gridDragData.priorityId,
        pieceId: `${gridDragData.componentId}_${gridDragData.tier}`,
        pieceName: `${gridDragData.componentName} Mk ${gridDragData.tier}`,
        componentName: gridDragData.componentName,
        shape: shape,
        row: pos.row,
        col: pos.col,
        rotation: gridDragData.currentRotation * 90,
        cells: cells
    };
    
    // Add to manual placements
    addManualPlacement(placement);
    
    // Update solution state to include this manual placement
    updateSolutionWithManualPlacements();
    
    // Update UI
    clearGridDragHighlight();
    gridDragData = null;
    
    renderGrid();
    renderPriorityList();
    updateGridStatus();
}

/**
 * Handle dragend for grid drag (cleanup)
 */
function handleGridDragEnd() {
    clearGridDragHighlight();
    gridDragData = null;
}

// State for grid piece repositioning
let gridPieceDragData = null;

/**
 * Handle dragstart on placed pieces for repositioning
 */
function handleGridPieceDragStart(e, priorityId, startRow, startCol) {
    const item = priorityList.find(p => p.id === priorityId);
    if (!item) return;
    
    const components = getComponents();
    const component = components[item.componentId];
    if (!component || !component.tiers[item.tier]) return;
    
    const tierData = component.tiers[item.tier];
    const rotations = getAllRotations(tierData.shape);
    const rotationIndex = item.rotation || 0;
    
    gridPieceDragData = {
        priorityId,
        componentId: item.componentId,
        tier: item.tier,
        componentName: component.name,
        rotations,
        currentRotation: rotationIndex,
        shape: rotations[rotationIndex],
        originalRow: startRow,
        originalCol: startCol
    };
    
    // Use the same highlighting as regular grid drag
    gridDragData = gridPieceDragData;
    
    e.dataTransfer.setData('text/plain', 'grid-piece-move');
    e.dataTransfer.effectAllowed = 'move';
    
    // Remove this piece from invalid placements if it was there
    invalidPlacements.delete(priorityId);
}

/**
 * Handle dragend for grid piece repositioning
 */
function handleGridPieceDragEnd() {
    clearGridDragHighlight();
    gridDragData = null;
    gridPieceDragData = null;
}

/**
 * Handle drop for grid piece repositioning
 */
function handleGridPieceDrop(e) {
    e.preventDefault();
    
    if (!gridPieceDragData) {
        // Fall through to regular grid drop
        handleGridDrop(e);
        return;
    }
    
    const pos = getGridCellFromEvent(e);
    if (!pos) {
        clearGridDragHighlight();
        gridPieceDragData = null;
        gridDragData = null;
        return;
    }
    
    const gridState = getGridState();
    const gridSize = getGridSize();
    const shape = gridPieceDragData.shape;
    const cells = getOccupiedCells(shape, pos.row, pos.col);
    const occupiedCells = getManuallyOccupiedCells();
    
    // Get cells from solution that aren't this piece
    const solution = getSolution();
    for (const placement of solution) {
        if (placement.priorityId !== gridPieceDragData.priorityId) {
            for (const cell of placement.cells) {
                occupiedCells.add(`${cell.row},${cell.col}`);
            }
        }
    }
    
    // Validate all cells
    let allValid = true;
    for (const cell of cells) {
        if (cell.row < 0 || cell.row >= gridSize || cell.col < 0 || cell.col >= gridSize) {
            allValid = false;
            break;
        }
        const cellValue = gridState[cell.row][cell.col];
        const isPowered = cellValue === 0 || cellValue === 1;
        const isOccupied = occupiedCells.has(`${cell.row},${cell.col}`);
        
        if (!isPowered || isOccupied) {
            allValid = false;
            break;
        }
    }
    
    // Create placement object
    const placement = {
        priorityId: gridPieceDragData.priorityId,
        pieceId: `${gridPieceDragData.componentId}_${gridPieceDragData.tier}`,
        pieceName: `${gridPieceDragData.componentName} Mk ${gridPieceDragData.tier}`,
        componentName: gridPieceDragData.componentName,
        shape: shape,
        row: pos.row,
        col: pos.col,
        rotation: gridPieceDragData.currentRotation * 90,
        cells: cells
    };
    
    if (!allValid) {
        // Keep the placement but mark as invalid
        invalidPlacements.add(gridPieceDragData.priorityId);
    } else {
        // Valid placement - remove from invalid set
        invalidPlacements.delete(gridPieceDragData.priorityId);
    }
    
    // Update manual placements
    addManualPlacement(placement);
    
    // Update solution state
    updateSolutionWithManualPlacements();
    
    // Clean up
    clearGridDragHighlight();
    gridDragData = null;
    gridPieceDragData = null;
    
    renderGrid();
    renderPriorityList();
    updateGridStatus();
}

/**
 * Update solution state with manual placements
 * This merges solver solution with manual placements
 */
function updateSolutionWithManualPlacements() {
    const manualPlacements = getManualPlacements();
    const currentSolution = getSolution();
    
    // Start with manual placements
    const newSolution = [...manualPlacements];
    
    // Add solver placements that don't conflict with manual ones
    const manualPriorityIds = new Set(manualPlacements.map(p => p.priorityId));
    const manualOccupied = getManuallyOccupiedCells();
    
    for (const placement of currentSolution) {
        // Skip if this priority ID is manually placed
        if (manualPriorityIds.has(placement.priorityId)) continue;
        
        // Skip if any cell conflicts with manual placements
        let conflicts = false;
        for (const cell of placement.cells) {
            if (manualOccupied.has(`${cell.row},${cell.col}`)) {
                conflicts = true;
                break;
            }
        }
        
        if (!conflicts) {
            newSolution.push(placement);
        }
    }
    
    setSolution(newSolution);
}

/**
 * Update grid status display (used for manual placement updates without re-solving)
 */
function updateGridStatus() {
    const solution = getSolution();
    const gridState = getGridState();
    const gridSize = getGridSize();
    
    // Count stats
    let poweredCount = 0;
    let protectedCount = 0;
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (gridState[r][c] === 0) poweredCount++;  // unprotected power
            if (gridState[r][c] === 1) {
                poweredCount++;
                protectedCount++;
            }
        }
    }
    
    let coveredCells = 0;
    let coveredProtected = 0;
    for (const placement of solution) {
        for (const cell of placement.cells) {
            coveredCells++;
            if (gridState[cell.row][cell.col] === 1) {
                coveredProtected++;
            }
        }
    }
    
    const componentsPlaced = solution.length;
    const totalComponents = priorityList.length;
    const offlineComponents = totalComponents - componentsPlaced;
    
    // Update placed priority IDs
    placedPriorityIds.clear();
    for (const placement of solution) {
        placedPriorityIds.add(placement.priorityId);
    }
    
    // Build message
    let message = `Placed ${componentsPlaced}/${totalComponents} components`;
    message += `, covering ${coveredCells}/${poweredCount} cells`;
    
    if (protectedCount > 0) {
        message += ` (${coveredProtected}/${protectedCount} protected)`;
    }
    
    if (offlineComponents > 0) {
        message += ` | ${offlineComponents} offline`;
    }
    
    // Update status display
    const statusEl = document.getElementById('solve-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = 'solve-status ' + (componentsPlaced === totalComponents ? 'success' : 'info');
    }
}

// Key handler for rotation during drag
document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
        if (gridDragData) {
            rotateGridDrag();
            e.preventDefault();
        }
    }
});

/**
 * Render the components accordion list with collapsible categories
 */
function renderComponents() {
    const container = document.getElementById('components-container');
    const components = getComponents();
    
    container.innerHTML = '';
    
    // Group components by category
    const categories = {};
    for (const [componentId, component] of Object.entries(components)) {
        const category = component.category || 'Other';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push({ componentId, component });
    }
    
    // Render by category
    for (const [category, items] of Object.entries(categories)) {
        // Filter items for this category
        const filteredItems = items.filter(({ componentId, component }) => {
            // Filter by name
            if (nameFilter && !component.name.toLowerCase().includes(nameFilter.toLowerCase())) {
                return false;
            }
            
            // Check if any tier matches filters
            const matchingTiers = getMatchingTiers(component.tiers, blocksFilter, tierFilters);
            return matchingTiers.length > 0;
        });
        
        if (filteredItems.length === 0) continue;
        
        const isExpanded = expandedCategory === category;
        
        // Create category header
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'component-category';
        if (isExpanded) categoryHeader.classList.add('expanded');
        
        const toggle = document.createElement('span');
        toggle.className = 'component-category-toggle';
        toggle.textContent = '▶';
        
        const categoryName = document.createElement('span');
        categoryName.className = 'component-category-name';
        categoryName.textContent = category;
        
        const count = document.createElement('span');
        count.className = 'component-category-count';
        count.textContent = filteredItems.length;
        
        categoryHeader.appendChild(toggle);
        categoryHeader.appendChild(categoryName);
        categoryHeader.appendChild(count);
        
        categoryHeader.addEventListener('click', () => {
            if (expandedCategory === category) {
                expandedCategory = null;
            } else {
                expandedCategory = category;
            }
            renderComponents();
        });
        
        container.appendChild(categoryHeader);
        
        // Category content wrapper
        const categoryContent = document.createElement('div');
        categoryContent.className = 'category-content';
        
        for (const { componentId, component } of filteredItems) {
            const matchingTiers = getMatchingTiers(component.tiers, blocksFilter, tierFilters);
            const tiersToShow = matchingTiers.length > 0 ? matchingTiers : Object.keys(component.tiers);
            
            // Check if any tier has a quantity set
            const hasSelection = tiersToShow.some(tier => {
                const key = `${componentId}_${tier}`;
                return (componentQuantities.get(key) || 0) > 0;
            });
            
            const isComponentExpanded = expandedComponents.has(componentId);
            
            // Create accordion
            const accordion = document.createElement('div');
            accordion.className = 'component-accordion';
            if (isComponentExpanded) accordion.classList.add('expanded');
            if (hasSelection) accordion.classList.add('has-selection');
            accordion.dataset.componentId = componentId;
            
            // Header
            const header = document.createElement('div');
            header.className = 'component-header';
            
            const compToggle = document.createElement('span');
            compToggle.className = 'component-toggle';
            compToggle.textContent = '▶';
            
            const name = document.createElement('span');
            name.className = 'component-name';
            name.textContent = component.name;
            
            const badge = document.createElement('span');
            badge.className = 'component-badge';
            badge.textContent = `${tiersToShow.length} tier${tiersToShow.length !== 1 ? 's' : ''}`;
            
            header.appendChild(compToggle);
            header.appendChild(name);
            header.appendChild(badge);
            
            // Tiers container
            const tiersContainer = document.createElement('div');
            tiersContainer.className = 'component-tiers';
            
            for (const tier of tiersToShow) {
                const tierData = component.tiers[tier];
                const shape = tierData.shape;
                const blockCount = countCells(shape);
                const key = `${componentId}_${tier}`;
                
                const tierItem = document.createElement('div');
                tierItem.className = 'tier-item';
                tierItem.draggable = true;
                tierItem.dataset.componentId = componentId;
                tierItem.dataset.tier = tier;
                
                const tierLabel = document.createElement('span');
                tierLabel.className = 'tier-label';
                tierLabel.textContent = `Mk ${tier}`;
                
                const quantityInput = document.createElement('input');
                quantityInput.type = 'number';
                quantityInput.className = 'tier-quantity';
                quantityInput.min = '0';
                quantityInput.max = '10';
                quantityInput.value = componentQuantities.get(key) || 0;
                quantityInput.dataset.componentId = componentId;
                quantityInput.dataset.tier = tier;
                
                const preview = createShapePreview(shape);
                
                const blocks = document.createElement('span');
                blocks.className = 'tier-blocks';
                blocks.textContent = `${blockCount} blocks`;
                
                // Drag handle indicator
                const dragHandle = document.createElement('span');
                dragHandle.className = 'tier-drag-handle';
                dragHandle.textContent = '⋮⋮';
                dragHandle.title = 'Drag to add to Build Order';
                
                tierItem.appendChild(dragHandle);
                tierItem.appendChild(tierLabel);
                tierItem.appendChild(quantityInput);
                tierItem.appendChild(preview);
                tierItem.appendChild(blocks);
                
                // Quantity change handlers
                quantityInput.addEventListener('change', handleQuantityChange);
                quantityInput.addEventListener('input', handleQuantityChange);
                
                // Drag handlers for adding to priority list
                tierItem.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                        type: 'component',
                        componentId: componentId,
                        tier: tier
                    }));
                    tierItem.classList.add('dragging');
                });
                
                tierItem.addEventListener('dragend', () => {
                    tierItem.classList.remove('dragging');
                });
                
                tiersContainer.appendChild(tierItem);
            }
            
            accordion.appendChild(header);
            accordion.appendChild(tiersContainer);
            
            // Toggle accordion on header click
            header.addEventListener('click', () => {
                if (expandedComponents.has(componentId)) {
                    expandedComponents.delete(componentId);
                } else {
                    expandedComponents.add(componentId);
                }
                renderComponents();
            });
            
            categoryContent.appendChild(accordion);
        }
        
        container.appendChild(categoryContent);
    }
}

/**
 * Get tiers that match the filters
 */
function getMatchingTiers(tiers, blockFilter, tierFiltersSet) {
    return Object.entries(tiers)
        .filter(([tier, data]) => {
            // Block filter
            if (blockFilter !== null && countCells(data.shape) !== blockFilter) {
                return false;
            }
            // Tier filter (if none selected, show all)
            if (tierFiltersSet.size > 0 && !tierFiltersSet.has(tier)) {
                return false;
            }
            return true;
        })
        .map(([tier]) => tier);
}

/**
 * Handle quantity input changes
 */
function handleQuantityChange(e) {
    const componentId = e.target.dataset.componentId;
    const tier = e.target.dataset.tier;
    const qty = parseInt(e.target.value) || 0;
    const key = `${componentId}_${tier}`;
    
    if (qty > 0) {
        componentQuantities.set(key, qty);
    } else {
        componentQuantities.delete(key);
    }
    
    // Sync priority list
    syncPriorityList(componentId, tier, qty);
    
    // Update accordion selection state
    updateAccordionSelection(componentId);
    
    // Clear solution since components changed
    clearSolution();
    placedPriorityIds.clear();
    renderGrid();
}

/**
 * Update accordion selection styling
 */
function updateAccordionSelection(componentId) {
    const accordion = document.querySelector(`[data-component-id="${componentId}"]`);
    if (!accordion) return;
    
    const components = getComponents();
    const component = components[componentId];
    if (!component) return;
    
    const hasSelection = Object.keys(component.tiers).some(tier => {
        const key = `${componentId}_${tier}`;
        return (componentQuantities.get(key) || 0) > 0;
    });
    
    accordion.classList.toggle('has-selection', hasSelection);
}

/**
 * Create a preview element for a shape
 */
function createShapePreview(shape) {
    const preview = document.createElement('div');
    preview.className = 'tier-preview';
    preview.style.gridTemplateColumns = `repeat(${shape[0].length}, 8px)`;
    preview.style.gridTemplateRows = `repeat(${shape.length}, 8px)`;
    
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            const cell = document.createElement('div');
            cell.className = 'tier-preview-cell';
            cell.classList.add(shape[row][col] ? 'filled' : 'empty');
            preview.appendChild(cell);
        }
    }
    
    return preview;
}

/**
 * Get selected components from priority list for solver
 */
function getSelectedComponentsFromPriority() {
    const components = getComponents();
    const selected = [];
    
    for (const item of priorityList) {
        const component = components[item.componentId];
        if (!component || !component.tiers[item.tier]) continue;
        
        // Get rotated shape if rotation is set
        const baseShape = component.tiers[item.tier].shape;
        const rotations = getAllRotations(baseShape);
        const rotationIndex = item.rotation || 0;
        const shape = rotations[rotationIndex % rotations.length];
        
        selected.push({
            id: item.id,
            priorityId: item.id,
            name: `${component.name} Mk ${item.tier}`,
            componentName: `${component.name} Mk ${item.tier}`,
            shape: shape,
            preferredRotation: rotationIndex
        });
    }
    
    return selected;
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Grid hover for highlighting priority items
    document.getElementById('grid-container').addEventListener('mouseover', (e) => {
        const overlay = e.target.closest('.piece-overlay');
        if (overlay && overlay.dataset.priorityId) {
            highlightPriorityItem(overlay.dataset.priorityId);
        }
    });
    
    document.getElementById('grid-container').addEventListener('mouseout', (e) => {
        const overlay = e.target.closest('.piece-overlay');
        if (overlay && overlay.dataset.priorityId) {
            unhighlightPriorityItem(overlay.dataset.priorityId);
        }
    });
    
    // Grid drag-and-drop for manual placement
    const gridContainer = document.getElementById('grid-container');
    gridContainer.addEventListener('dragover', handleGridDragOver);
    gridContainer.addEventListener('dragleave', handleGridDragLeave);
    gridContainer.addEventListener('drop', (e) => {
        // Check if this is a grid piece move or a new placement
        if (gridPieceDragData) {
            handleGridPieceDrop(e);
        } else {
            handleGridDrop(e);
        }
    });
    
    // Filter inputs
    document.getElementById('filter-name').addEventListener('input', (e) => {
        nameFilter = e.target.value;
        renderComponents();
    });
    
    document.getElementById('filter-blocks').addEventListener('input', (e) => {
        blocksFilter = e.target.value ? parseInt(e.target.value) : null;
        renderComponents();
    });
    
    // Tier checkboxes
    document.querySelectorAll('input[name="filter-tier"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            tierFilters.clear();
            document.querySelectorAll('input[name="filter-tier"]:checked').forEach(cb => {
                tierFilters.add(cb.value);
            });
            renderComponents();
        });
    });
    
    // Clear grid button - clears everything with confirmation
    document.getElementById('clear-grid-btn').addEventListener('click', async () => {
        const confirmed = await showDialog({
            title: 'Reset All?',
            message: `
                <p>This will:</p>
                <ul>
                    <li>Clear the power grid configuration</li>
                    <li>Remove all selected components</li>
                    <li>Clear all solutions and placements</li>
                </ul>
            `,
            icon: 'warning',
            buttons: [
                { text: 'Cancel', action: 'cancel', style: 'secondary' },
                { text: 'Reset Everything', action: 'confirm', style: 'danger' }
            ]
        });
        
        if (confirmed !== 'confirm') return;
        
        clearGrid();
        clearSolution();
        clearManualPlacements();
        clearAllSolutions();
        placedPriorityIds.clear();
        
        // Reset reactor/aux selections
        currentReactor = '';
        currentReactorTier = '1';
        currentAux1 = 'none';
        currentAux1Tier = '1';
        currentAux2 = 'none';
        currentAux2Tier = '1';
        expandedPowerCategory = null;
        
        // Clear components and priority
        componentQuantities.clear();
        priorityList = [];
        priorityIdCounter = 0;
        
        // Clear all localStorage
        clearAllPersistedState();
        
        // Also delete unsaved build
        deleteCurrentUnsaved();
        
        renderGridConfig();
        renderGrid();
        renderComponents();
        renderPriorityList();
        renderBuildSelector();
        updateGridStats();
        updateSolutionDropdown([]);
        updateSaveIndicator();
        updateStatus('All cleared', 'info');
    });
    
    // Clear solutions button - clears all solutions and manual placements with confirmation
    document.getElementById('clear-solution-btn').addEventListener('click', async () => {
        const confirmed = await showDialog({
            title: 'Clear Solutions?',
            message: `
                <p>This will:</p>
                <ul>
                    <li>Remove all placed components from the grid</li>
                    <li>Keep your selected components list intact</li>
                </ul>
            `,
            icon: 'warning',
            buttons: [
                { text: 'Cancel', action: 'cancel', style: 'secondary' },
                { text: 'Clear Solutions', action: 'confirm', style: 'danger' }
            ]
        });
        
        if (confirmed !== 'confirm') return;
        
        clearSolution();
        clearManualPlacements();
        clearAllSolutions();
        placedPriorityIds.clear();
        invalidPlacements.clear();
        renderGrid();
        renderPriorityList();
        updateSolutionDropdown([]);
        updateStatus('Solutions cleared', 'info');
    });
    
    // Solution dropdown
    document.getElementById('solution-select').addEventListener('change', (e) => {
        if (e.target.value) {
            applySolution(e.target.value);
        }
    });
    
    // Solve button
    document.getElementById('solve-btn').addEventListener('click', () => {
        runSolver();
    });
}

/**
 * Run the solver
 */
function runSolver() {
    const selectedComponents = getSelectedComponentsFromPriority();
    const gridState = getGridState();
    const gridSize = getGridSize();
    
    clearSolution();
    clearManualPlacements();
    placedPriorityIds.clear();
    invalidPlacements.clear();
    
    if (selectedComponents.length === 0) {
        updateStatus('Add components to the build order first', 'error');
        updateSolutionDropdown([]);
        return;
    }
    
    const solveBtn = document.getElementById('solve-btn');
    solveBtn.disabled = true;
    solveBtn.textContent = 'Solving...';
    updateStatus('Searching for solution...', 'info');
    
    setTimeout(() => {
        const result = solve(selectedComponents, gridState, gridSize);
        
        if (result.solution && result.solution.length > 0) {
            setSolution(result.solution);
            
            // Store all solutions for dropdown
            if (result.solutions && result.solutions.length > 0) {
                setAllSolutions(result.solutions);
                updateSolutionDropdown(result.solutions);
            } else {
                setAllSolutions([]);
                updateSolutionDropdown([]);
            }
            
            // Track which priority items are placed
            placedPriorityIds = new Set(result.solution.map(p => p.priorityId));
            
            updateStatus(result.message, 'success');
        } else {
            updateStatus(result.message || 'No solution found', 'error');
            setAllSolutions([]);
            updateSolutionDropdown([]);
        }
        
        renderGrid();
        renderPriorityList();
        
        solveBtn.disabled = false;
        solveBtn.textContent = 'Solve';
    }, 50);
}

/**
 * Update the solution dropdown with available solutions
 */
function updateSolutionDropdown(solutions) {
    const select = document.getElementById('solution-select');
    select.innerHTML = '';
    
    if (!solutions || solutions.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Run solver first --';
        select.appendChild(option);
        select.disabled = true;
        return;
    }
    
    solutions.forEach((sol, index) => {
        const option = document.createElement('option');
        option.value = sol.id;
        option.textContent = sol.title;
        // Add tooltip from solution data
        if (sol.tooltip) {
            option.title = sol.tooltip;
        }
        if (index === 0) option.selected = true;
        select.appendChild(option);
    });
    
    select.disabled = solutions.length <= 1;
}

/**
 * Apply a selected solution from the dropdown
 */
function applySolution(solutionId) {
    const solutions = getAllSolutions();
    const selected = solutions.find(s => s.id === solutionId);
    
    if (!selected) return;
    
    // Clear manual placements when switching solutions
    clearManualPlacements();
    
    // Apply the selected solution
    setSolution(selected.solution);
    
    // Track which priority items are placed
    placedPriorityIds = new Set(selected.solution.map(p => p.priorityId));
    
    // Update UI
    renderGrid();
    renderPriorityList();
    
    // Update status with solution info
    const stats = selected.stats;
    let message = `Placed ${stats.placed}/${stats.total} components`;
    message += `, covering ${stats.coveredCells}/${stats.poweredCount} cells`;
    if (stats.protectedCount > 0) {
        message += ` (${stats.coveredProtected}/${stats.protectedCount} protected)`;
    }
    updateStatus(message, 'success');
}

/**
 * Update the status message
 */
function updateStatus(message, type) {
    const status = document.getElementById('solve-status');
    status.textContent = message;
    status.className = 'solve-status ' + type;
}

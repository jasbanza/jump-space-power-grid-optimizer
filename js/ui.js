/**
 * UI Event Handlers and Rendering for Power Grid Optimizer
 */

import { 
    getGridState, getGridSize, toggleCell, clearGrid, 
    setSolution, getSolution, clearSolution, setGridFromTemplate
} from './grid.js';
import { getComponents, countCells } from './components.js';
import { solve } from './solver.js';
import { 
    getReactorList, getAuxGeneratorList, combineGrid, getGridStats 
} from './templates.js';

// Track component tier quantities: Map<"componentId_tier", quantity>
const componentQuantities = new Map();

// Priority list: Array of {id, componentId, tier, mandatory, protect}
let priorityList = [];
let priorityIdCounter = 0;

// Filter state
let nameFilter = '';
let blocksFilter = null;
let tierFilter = '';

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
export function initUI() {
    // Load saved state before rendering
    loadSavedState();
    
    // Apply grid config if we have a saved reactor
    if (currentReactor) {
        applyGridConfig();
    }
    
    renderGrid();
    renderComponents();
    renderGridConfig();
    renderPriorityList();
    setupEventListeners();
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
            if (value === 2) {
                cell.classList.add('protected');
            } else if (value === 1) {
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
    
    solution.forEach((placement) => {
        const priorityId = placement.priorityId;
        let minRow = Infinity, maxRow = -1, minCol = Infinity, maxCol = -1;
        
        // Look up protect status from priority list
        const priorityItem = priorityList.find(p => p.id === priorityId);
        const isProtected = priorityItem ? priorityItem.protect : false;
        
        for (const cell of placement.cells) {
            const key = `${cell.row},${cell.col}`;
            placedCellsMap.set(key, {
                priorityId: priorityId,
                componentName: placement.componentName || placement.pieceName,
                protect: isProtected
            });
            
            minRow = Math.min(minRow, cell.row);
            maxRow = Math.max(maxRow, cell.row);
            minCol = Math.min(minCol, cell.col);
            maxCol = Math.max(maxCol, cell.col);
        }
        
        componentBounds.set(priorityId, {
            minRow, maxRow, minCol, maxCol,
            name: placement.componentName || placement.pieceName
        });
    });
    
    container.innerHTML = '';
    
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const cellValue = gridState[row][col];
            if (cellValue === 2) {
                cell.classList.add('protected');
            } else if (cellValue === 1) {
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
                
                // Add protected class if component is marked as protected
                if (componentInfo.protect) {
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
        label.title = name;
        
        container.appendChild(label);
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
            if (item.protect) {
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
        
        // Preview
        const preview = createSmallShapePreview(tierData.shape);
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
        
        // Checkbox container for Must and Protect
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'priority-checkboxes';
        
        // Mandatory checkbox
        const mandatory = document.createElement('label');
        mandatory.className = 'priority-checkbox';
        
        const mandatoryCheckbox = document.createElement('input');
        mandatoryCheckbox.type = 'checkbox';
        mandatoryCheckbox.checked = item.mandatory;
        mandatoryCheckbox.addEventListener('change', (e) => {
            item.mandatory = e.target.checked;
            savePriorityList();
        });
        
        mandatory.appendChild(mandatoryCheckbox);
        mandatory.appendChild(document.createTextNode('🔒'));
        
        // Protect checkbox
        const protect = document.createElement('label');
        protect.className = 'priority-checkbox';
        
        const protectCheckbox = document.createElement('input');
        protectCheckbox.type = 'checkbox';
        protectCheckbox.checked = item.protect || false;
        protectCheckbox.addEventListener('change', (e) => {
            item.protect = e.target.checked;
            savePriorityList();
        });
        
        protect.appendChild(protectCheckbox);
        protect.appendChild(document.createTextNode('🛡️'));
        
        checkboxContainer.appendChild(mandatory);
        checkboxContainer.appendChild(protect);
        
        // Remove button
        const remove = document.createElement('button');
        remove.className = 'priority-remove';
        remove.textContent = '×';
        remove.addEventListener('click', () => {
            removePriorityItem(item.id);
        });
        
        div.appendChild(handle);
        div.appendChild(preview);
        div.appendChild(info);
        div.appendChild(checkboxContainer);
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
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.priority-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    draggedItem = null;
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
                tier,
                mandatory: false,
                protect: false
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
            const matchingTiers = getMatchingTiers(component.tiers, blocksFilter, tierFilter);
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
            const matchingTiers = getMatchingTiers(component.tiers, blocksFilter, tierFilter);
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
function getMatchingTiers(tiers, blockFilter, tierFilterValue) {
    return Object.entries(tiers)
        .filter(([tier, data]) => {
            // Block filter
            if (blockFilter !== null && countCells(data.shape) !== blockFilter) {
                return false;
            }
            // Tier filter
            if (tierFilterValue && tier !== tierFilterValue) {
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
        
        selected.push({
            id: item.id,
            priorityId: item.id,
            name: `${component.name} Mk ${item.tier}`,
            componentName: `${component.name} Mk ${item.tier}`,
            shape: component.tiers[item.tier].shape,
            mandatory: item.mandatory,
            protect: item.protect || false
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
    
    // Filter inputs
    document.getElementById('filter-name').addEventListener('input', (e) => {
        nameFilter = e.target.value;
        renderComponents();
    });
    
    document.getElementById('filter-blocks').addEventListener('input', (e) => {
        blocksFilter = e.target.value ? parseInt(e.target.value) : null;
        renderComponents();
    });
    
    document.getElementById('filter-tier').addEventListener('change', (e) => {
        tierFilter = e.target.value;
        renderComponents();
    });
    
    // Clear grid button - clears everything
    document.getElementById('clear-grid-btn').addEventListener('click', () => {
        clearGrid();
        clearSolution();
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
        
        renderGridConfig();
        renderGrid();
        renderComponents();
        renderPriorityList();
        updateGridStats();
        updateStatus('All cleared', 'info');
    });
    
    // Clear solution button - only clears the solution visualization
    document.getElementById('clear-solution-btn').addEventListener('click', () => {
        clearSolution();
        placedPriorityIds.clear();
        renderGrid();
        renderPriorityList();
        updateStatus('Solution cleared', 'info');
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
    placedPriorityIds.clear();
    
    if (selectedComponents.length === 0) {
        updateStatus('Add components to the build order first', 'error');
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
            
            // Track which priority items are placed
            placedPriorityIds = new Set(result.solution.map(p => p.priorityId));
            
            updateStatus(result.message, 'success');
        } else {
            updateStatus(result.message || 'No solution found', 'error');
        }
        
        renderGrid();
        renderPriorityList();
        
        solveBtn.disabled = false;
        solveBtn.textContent = 'Solve';
    }, 50);
}

/**
 * Update the status message
 */
function updateStatus(message, type) {
    const status = document.getElementById('solve-status');
    status.textContent = message;
    status.className = 'solve-status ' + type;
}

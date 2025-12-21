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

// Priority list: Array of {id, componentId, tier, mandatory}
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

/**
 * Initialize the UI
 */
export function initUI() {
    renderGrid();
    renderComponents();
    renderGridConfig();
    renderPriorityList();
    setupEventListeners();
}

/**
 * Render the grid configuration with custom dropdowns
 */
function renderGridConfig() {
    const reactors = getReactorList();
    const auxGenerators = getAuxGeneratorList();
    
    // Render reactor dropdown
    renderCustomDropdown('reactor-dropdown', reactors, currentReactor, currentReactorTier, 'reactor');
    
    // Render aux generator dropdowns
    renderCustomDropdown('aux1-dropdown', auxGenerators, currentAux1, currentAux1Tier, 'aux');
    renderCustomDropdown('aux2-dropdown', auxGenerators, currentAux2, currentAux2Tier, 'aux');
    
    updateGridStats();
}

/**
 * Render a custom dropdown with grid previews
 */
function renderCustomDropdown(containerId, items, selectedId, selectedTier, type) {
    const container = document.getElementById(containerId);
    const optionsContainer = container.querySelector('.dropdown-options');
    const textEl = container.querySelector('.dropdown-text');
    
    optionsContainer.innerHTML = '';
    
    // For aux generators, add a "None" option first if not already there
    if (type === 'aux') {
        const noneOption = items.find(i => i.id === 'none');
        if (noneOption && selectedId === 'none') {
            textEl.textContent = 'None';
        }
    }
    
    // Update selected text
    const selectedItem = items.find(i => i.id === selectedId && i.tier === selectedTier);
    if (selectedItem) {
        textEl.textContent = selectedItem.displayName;
    } else if (type === 'reactor') {
        textEl.textContent = '-- Select Reactor --';
    }
    
    // Create options
    for (const item of items) {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
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
        info.className = 'dropdown-option-info';
        
        const name = document.createElement('div');
        name.className = 'dropdown-option-name';
        name.textContent = item.displayName;
        
        const stats = document.createElement('div');
        stats.className = 'dropdown-option-stats';
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
            handleDropdownSelect(containerId, item.id, item.tier);
        });
        
        optionsContainer.appendChild(option);
    }
}

/**
 * Create a grid preview element
 */
function createGridPreview(grid) {
    const preview = document.createElement('div');
    preview.className = 'dropdown-option-preview';
    preview.style.gridTemplateColumns = `repeat(${grid[0].length}, 6px)`;
    preview.style.gridTemplateRows = `repeat(${grid.length}, 6px)`;
    
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const cell = document.createElement('div');
            cell.className = 'dropdown-option-preview-cell';
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
 * Handle dropdown selection
 */
function handleDropdownSelect(containerId, id, tier) {
    const container = document.getElementById(containerId);
    container.classList.remove('open');
    
    if (containerId === 'reactor-dropdown') {
        currentReactor = id;
        currentReactorTier = tier;
    } else if (containerId === 'aux1-dropdown') {
        currentAux1 = id;
        currentAux1Tier = tier;
    } else if (containerId === 'aux2-dropdown') {
        currentAux2 = id;
        currentAux2Tier = tier;
    }
    
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
        
        for (const cell of placement.cells) {
            const key = `${cell.row},${cell.col}`;
            placedCellsMap.set(key, {
                priorityId: priorityId,
                componentName: placement.componentName || placement.pieceName
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
                cell.appendChild(overlay);
            }
            
            container.appendChild(cell);
        }
    }
    
    // Add labels for each placed component (positioned at center of bounding box)
    for (const [priorityId, bounds] of componentBounds) {
        const label = document.createElement('div');
        label.className = 'piece-label';
        label.dataset.priorityId = priorityId;
        
        // Calculate position
        const cellSize = 42; // grid cell size + gap
        const centerRow = (bounds.minRow + bounds.maxRow) / 2;
        const centerCol = (bounds.minCol + bounds.maxCol) / 2;
        
        label.style.top = `${centerRow * cellSize + 20}px`;
        label.style.left = `${bounds.minCol * cellSize + 2}px`;
        label.style.width = `${(bounds.maxCol - bounds.minCol + 1) * cellSize - 4}px`;
        
        // Abbreviate long names
        const name = bounds.name;
        label.textContent = name.length > 12 ? name.substring(0, 10) + '...' : name;
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
    
    if (priorityList.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'priority-empty';
        empty.textContent = 'Add components to build your ship configuration';
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
        
        // Mandatory checkbox
        const mandatory = document.createElement('label');
        mandatory.className = 'priority-mandatory';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.mandatory;
        checkbox.addEventListener('change', (e) => {
            item.mandatory = e.target.checked;
        });
        
        mandatory.appendChild(checkbox);
        mandatory.appendChild(document.createTextNode('Must'));
        
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
        div.appendChild(mandatory);
        div.appendChild(remove);
        
        // Drag events
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragend', handleDragEnd);
        div.addEventListener('dragover', handleDragOver);
        div.addEventListener('drop', handleDrop);
        div.addEventListener('dragleave', handleDragLeave);
        
        // Hover events for highlighting
        div.addEventListener('mouseenter', () => highlightGridCells(item.id));
        div.addEventListener('mouseleave', () => unhighlightGridCells(item.id));
        
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
        renderPriorityList();
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
                mandatory: false
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
                
                tierItem.appendChild(tierLabel);
                tierItem.appendChild(quantityInput);
                tierItem.appendChild(preview);
                tierItem.appendChild(blocks);
                
                // Quantity change handlers
                quantityInput.addEventListener('change', handleQuantityChange);
                quantityInput.addEventListener('input', handleQuantityChange);
                
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
            mandatory: item.mandatory
        });
    }
    
    return selected;
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Grid cell click
    document.getElementById('grid-container').addEventListener('click', (e) => {
        const cell = e.target.closest('.grid-cell');
        if (cell && !cell.classList.contains('has-piece')) {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            toggleCell(row, col);
            clearSolution();
            placedPriorityIds.clear();
            renderGrid();
            renderPriorityList();
        }
    });
    
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
    
    // Custom dropdown toggles
    document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
        const selected = dropdown.querySelector('.dropdown-selected');
        selected.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close other dropdowns
            document.querySelectorAll('.custom-dropdown').forEach(d => {
                if (d !== dropdown) d.classList.remove('open');
            });
            dropdown.classList.toggle('open');
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-dropdown').forEach(d => {
            d.classList.remove('open');
        });
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
    
    // Clear grid button
    document.getElementById('clear-grid-btn').addEventListener('click', () => {
        clearGrid();
        clearSolution();
        placedPriorityIds.clear();
        currentReactor = '';
        currentReactorTier = '1';
        currentAux1 = 'none';
        currentAux1Tier = '1';
        currentAux2 = 'none';
        currentAux2Tier = '1';
        renderGridConfig();
        renderGrid();
        renderPriorityList();
        updateGridStats();
        updateStatus('Grid cleared', 'info');
    });
    
    // Clear solution button
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

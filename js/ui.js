/**
 * UI Event Handlers and Rendering for Power Grid Optimizer
 */

import { 
    getGridState, getGridSize, toggleCell, clearGrid, 
    setSolution, getSolution, clearSolution, setGridFromTemplate,
    isCellProtected
} from './grid.js';
import { getComponents, countCells } from './components.js';
import { solve } from './solver.js';
import { getTemplates, getTemplateList } from './templates.js';

// Track component tier quantities: Map<"componentId_tier", quantity>
const componentQuantities = new Map();

// Filter state
let nameFilter = '';
let blocksFilter = null;

// Expanded accordions
const expandedComponents = new Set();

// Component colors for visualization
const COMPONENT_COLORS = [
    'piece-color-0', 'piece-color-1', 'piece-color-2', 'piece-color-3',
    'piece-color-4', 'piece-color-5', 'piece-color-6', 'piece-color-7',
    'piece-color-8', 'piece-color-9'
];

/**
 * Initialize the UI
 */
export function initUI() {
    renderGrid();
    renderComponents();
    renderTemplates();
    setupEventListeners();
}

/**
 * Render the template selector dropdown
 */
function renderTemplates() {
    const select = document.getElementById('template-select');
    const templates = getTemplateList();
    
    // Clear existing options except the default
    select.innerHTML = '<option value="">-- Select Template --</option>';
    
    // Add templates
    templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name;
        select.appendChild(option);
    });
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
    solution.forEach((placement, idx) => {
        for (const cell of placement.cells) {
            const key = `${cell.row},${cell.col}`;
            placedCellsMap.set(key, {
                colorClass: COMPONENT_COLORS[idx % COMPONENT_COLORS.length],
                componentName: placement.componentName || placement.pieceName
            });
        }
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
                const overlay = document.createElement('div');
                overlay.className = `piece-overlay ${componentInfo.colorClass}`;
                overlay.title = componentInfo.componentName;
                cell.appendChild(overlay);
            }
            
            container.appendChild(cell);
        }
    }
}

/**
 * Render the components accordion list
 */
function renderComponents() {
    const container = document.getElementById('components-container');
    const components = getComponents();
    
    container.innerHTML = '';
    
    for (const [componentId, component] of Object.entries(components)) {
        // Filter by name
        if (nameFilter && !component.name.toLowerCase().includes(nameFilter.toLowerCase())) {
            continue;
        }
        
        // Get matching tiers based on block filter
        const matchingTiers = getMatchingTiers(component.tiers, blocksFilter);
        
        // Skip if no tiers match block filter
        if (blocksFilter !== null && matchingTiers.length === 0) {
            continue;
        }
        
        const tiersToShow = blocksFilter !== null ? matchingTiers : Object.keys(component.tiers);
        
        // Check if any tier has a quantity set
        const hasSelection = tiersToShow.some(tier => {
            const key = `${componentId}_${tier}`;
            return (componentQuantities.get(key) || 0) > 0;
        });
        
        const isExpanded = expandedComponents.has(componentId);
        
        // Create accordion
        const accordion = document.createElement('div');
        accordion.className = 'component-accordion';
        if (isExpanded) accordion.classList.add('expanded');
        if (hasSelection) accordion.classList.add('has-selection');
        accordion.dataset.componentId = componentId;
        
        // Header
        const header = document.createElement('div');
        header.className = 'component-header';
        
        const toggle = document.createElement('span');
        toggle.className = 'component-toggle';
        toggle.textContent = '▶';
        
        const name = document.createElement('span');
        name.className = 'component-name';
        name.textContent = component.name;
        
        const badge = document.createElement('span');
        badge.className = 'component-badge';
        badge.textContent = `${tiersToShow.length} tier${tiersToShow.length !== 1 ? 's' : ''}`;
        
        header.appendChild(toggle);
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
            tierLabel.textContent = `T${tier}`;
            
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
            blocks.textContent = `${blockCount} block${blockCount !== 1 ? 's' : ''}`;
            
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
        
        container.appendChild(accordion);
    }
}

/**
 * Get tiers that match the block filter
 */
function getMatchingTiers(tiers, blockFilter) {
    if (blockFilter === null) return Object.keys(tiers);
    
    return Object.entries(tiers)
        .filter(([tier, data]) => countCells(data.shape) === blockFilter)
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
    
    // Update accordion selection state
    updateAccordionSelection(componentId);
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
 * @param {number[][]} shape - The shape
 * @returns {HTMLElement} - Preview element
 */
function createShapePreview(shape) {
    const preview = document.createElement('div');
    preview.className = 'tier-preview';
    preview.style.gridTemplateColumns = `repeat(${shape[0].length}, 10px)`;
    preview.style.gridTemplateRows = `repeat(${shape.length}, 10px)`;
    
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
 * Get selected components as array for solver
 * @returns {Array} - Array of component objects with shapes
 */
function getSelectedComponents() {
    const components = getComponents();
    const selected = [];
    
    for (const [key, quantity] of componentQuantities.entries()) {
        const [componentId, tier] = key.split('_');
        const component = components[componentId];
        
        if (component && component.tiers[tier]) {
            for (let i = 0; i < quantity; i++) {
                selected.push({
                    id: `${componentId}_${tier}_${i}`,
                    name: `${component.name} T${tier}`,
                    componentName: `${component.name} T${tier}`,
                    shape: component.tiers[tier].shape,
                    instanceId: `${componentId}_${tier}_${i}`
                });
            }
        }
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
        if (cell) {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            toggleCell(row, col);
            clearSolution();
            renderGrid();
        }
    });
    
    // Template selector
    document.getElementById('template-select').addEventListener('change', (e) => {
        const templateId = e.target.value;
        const templates = getTemplates();
        if (templateId && templates[templateId]) {
            setGridFromTemplate(templates[templateId].grid);
            clearSolution();
            renderGrid();
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
    
    // Clear grid button
    document.getElementById('clear-grid-btn').addEventListener('click', () => {
        clearGrid();
        clearSolution();
        renderGrid();
        updateStatus('Grid cleared', 'info');
    });
    
    // Clear solution button
    document.getElementById('clear-solution-btn').addEventListener('click', () => {
        clearSolution();
        renderGrid();
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
    const selectedComponents = getSelectedComponents();
    const gridState = getGridState();
    const gridSize = getGridSize();
    const requireAll = document.getElementById('require-all-checkbox').checked;
    
    clearSolution();
    
    const solveBtn = document.getElementById('solve-btn');
    solveBtn.disabled = true;
    solveBtn.textContent = 'Solving...';
    updateStatus('Searching for solution...', 'info');
    
    setTimeout(() => {
        const result = solve(selectedComponents, gridState, gridSize, requireAll);
        
        if (result.success) {
            setSolution(result.solution);
            updateStatus(result.message, 'success');
        } else {
            updateStatus(result.message, 'error');
        }
        
        renderGrid();
        
        solveBtn.disabled = false;
        solveBtn.textContent = 'Solve';
    }, 50);
}

/**
 * Update the status message
 * @param {string} message - Status message
 * @param {string} type - Message type ('success', 'error', 'info')
 */
function updateStatus(message, type) {
    const status = document.getElementById('solve-status');
    status.textContent = message;
    status.className = 'solve-status ' + type;
}

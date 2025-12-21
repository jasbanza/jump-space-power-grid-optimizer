/**
 * UI Event Handlers and Rendering for Power Grid Optimizer
 */

import { 
    getGridState, getGridSize, toggleCell, clearGrid, 
    setSolution, getSolution, clearSolution, setGridFromTemplate 
} from './grid.js';
import { PIECES } from './pieces.js';
import { solve } from './solver.js';
import { GRID_TEMPLATES, getTemplateList } from './templates.js';

// Track piece quantities (pieceId -> count)
const pieceQuantities = new Map();

// Piece colors for visualization
const PIECE_COLORS = [
    'piece-color-0', 'piece-color-1', 'piece-color-2', 'piece-color-3',
    'piece-color-4', 'piece-color-5', 'piece-color-6', 'piece-color-7',
    'piece-color-8', 'piece-color-9'
];

/**
 * Initialize the UI
 */
export function initUI() {
    renderGrid();
    renderPieces();
    renderTemplates();
    setupEventListeners();
}

/**
 * Render the template selector dropdown
 */
function renderTemplates() {
    const select = document.getElementById('template-select');
    const templates = getTemplateList();
    
    // Keep the default option, add templates
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
    
    // Build a map of placed pieces for quick lookup
    const placedCellsMap = new Map();
    solution.forEach((placement, idx) => {
        for (const cell of placement.cells) {
            const key = `${cell.row},${cell.col}`;
            placedCellsMap.set(key, {
                colorClass: PIECE_COLORS[idx % PIECE_COLORS.length],
                pieceName: placement.pieceName
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
            
            if (gridState[row][col]) {
                cell.classList.add('powered');
            }
            
            // Add piece overlay if this cell has a placed piece
            const key = `${row},${col}`;
            if (placedCellsMap.has(key)) {
                const pieceInfo = placedCellsMap.get(key);
                cell.classList.add('has-piece');
                const overlay = document.createElement('div');
                overlay.className = `piece-overlay ${pieceInfo.colorClass}`;
                overlay.title = pieceInfo.pieceName;
                cell.appendChild(overlay);
            }
            
            container.appendChild(cell);
        }
    }
}

/**
 * Render the pieces selection panel
 */
function renderPieces() {
    const container = document.getElementById('pieces-container');
    container.innerHTML = '';
    
    for (const [key, piece] of Object.entries(PIECES)) {
        const item = document.createElement('div');
        item.className = 'piece-item';
        item.dataset.pieceId = piece.id;
        
        // Quantity input
        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.className = 'piece-quantity';
        quantityInput.id = `piece-qty-${piece.id}`;
        quantityInput.min = '0';
        quantityInput.max = '10';
        quantityInput.value = pieceQuantities.get(piece.id) || 0;
        
        // Preview
        const preview = createPiecePreview(piece.shape);
        
        // Name
        const name = document.createElement('span');
        name.className = 'piece-name';
        name.textContent = piece.name;
        
        item.appendChild(quantityInput);
        item.appendChild(preview);
        item.appendChild(name);
        
        // Quantity change handler
        quantityInput.addEventListener('change', (e) => {
            const qty = parseInt(e.target.value) || 0;
            updatePieceQuantity(piece.id, qty);
            item.classList.toggle('selected', qty > 0);
        });
        
        // Also handle input event for immediate feedback
        quantityInput.addEventListener('input', (e) => {
            const qty = parseInt(e.target.value) || 0;
            updatePieceQuantity(piece.id, qty);
            item.classList.toggle('selected', qty > 0);
        });
        
        // Set initial selected state
        const currentQty = pieceQuantities.get(piece.id) || 0;
        if (currentQty > 0) {
            item.classList.add('selected');
        }
        
        container.appendChild(item);
    }
}

/**
 * Create a preview element for a piece shape
 * @param {number[][]} shape - The piece shape
 * @returns {HTMLElement} - Preview element
 */
function createPiecePreview(shape) {
    const preview = document.createElement('div');
    preview.className = 'piece-preview';
    preview.style.gridTemplateColumns = `repeat(${shape[0].length}, 12px)`;
    preview.style.gridTemplateRows = `repeat(${shape.length}, 12px)`;
    
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            const cell = document.createElement('div');
            cell.className = 'piece-preview-cell';
            cell.classList.add(shape[row][col] ? 'filled' : 'empty');
            preview.appendChild(cell);
        }
    }
    
    return preview;
}

/**
 * Update piece quantity
 * @param {string} pieceId - Piece ID
 * @param {number} quantity - Number of this piece to use
 */
function updatePieceQuantity(pieceId, quantity) {
    if (quantity > 0) {
        pieceQuantities.set(pieceId, quantity);
    } else {
        pieceQuantities.delete(pieceId);
    }
}

/**
 * Get selected pieces as array (with duplicates based on quantity)
 * @returns {Array} - Array of selected piece objects
 */
function getSelectedPieces() {
    const pieces = [];
    for (const [pieceId, quantity] of pieceQuantities.entries()) {
        const piece = PIECES[pieceId];
        if (piece) {
            // Add the piece multiple times based on quantity
            for (let i = 0; i < quantity; i++) {
                // Create a copy with a unique instance id for tracking
                pieces.push({
                    ...piece,
                    instanceId: `${piece.id}_${i}`
                });
            }
        }
    }
    return pieces;
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
            // Clear solution when grid changes
            clearSolution();
            renderGrid();
        }
    });
    
    // Template selector
    document.getElementById('template-select').addEventListener('change', (e) => {
        const templateId = e.target.value;
        if (templateId && GRID_TEMPLATES[templateId]) {
            setGridFromTemplate(GRID_TEMPLATES[templateId].grid);
            clearSolution();
            renderGrid();
            updateStatus(`Loaded template: ${GRID_TEMPLATES[templateId].name}`, 'info');
        }
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
    const selectedPiecesList = getSelectedPieces();
    const gridState = getGridState();
    const gridSize = getGridSize();
    const requireAll = document.getElementById('require-all-checkbox').checked;
    
    // Clear previous solution
    clearSolution();
    
    // Update UI to show solving
    const solveBtn = document.getElementById('solve-btn');
    solveBtn.disabled = true;
    solveBtn.textContent = 'Solving...';
    updateStatus('Searching for solution...', 'info');
    
    // Run solver (use setTimeout to allow UI update)
    setTimeout(() => {
        const result = solve(selectedPiecesList, gridState, gridSize, requireAll);
        
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

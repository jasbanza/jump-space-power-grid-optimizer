/**
 * Grid State Management for Power Grid Optimizer
 * 
 * Grid cell values:
 * - 0 = unpowered (black)
 * - 1 = powered (green)
 * - 2 = protected (light blue - prioritized in solver)
 */

const GRID_SIZE = 8;
const STORAGE_KEY = 'jumpspace-grid-state';

// Grid state: 2D array of cell values (0, 1, or 2)
let gridState = createEmptyGrid();

// Solution state: tracks which components are placed where
let solutionState = [];

/**
 * Create an empty 8x8 grid
 * @returns {number[][]} - Empty grid with all zeros
 */
function createEmptyGrid() {
    return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
}

/**
 * Initialize the grid state (load from localStorage if available)
 */
export function initGrid() {
    loadGridState();
}

/**
 * Get the current grid state
 * @returns {number[][]} - Current grid state
 */
export function getGridState() {
    return gridState;
}

/**
 * Get the grid size
 * @returns {number} - Grid size (8)
 */
export function getGridSize() {
    return GRID_SIZE;
}

/**
 * Toggle a cell's state: 0 -> 1 -> 2 -> 0
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {number} - New state of the cell
 */
export function toggleCell(row, col) {
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        // Cycle through: 0 -> 1 -> 0 (simple toggle for now)
        // Users can use templates for protected cells
        gridState[row][col] = gridState[row][col] === 0 ? 1 : 0;
        saveGridState();
        return gridState[row][col];
    }
    return 0;
}

/**
 * Set a cell's state
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {number} value - Cell value (0, 1, or 2)
 */
export function setCell(row, col, value) {
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        gridState[row][col] = value;
        saveGridState();
    }
}

/**
 * Get cell value
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {number} - Cell value (0, 1, or 2)
 */
export function getCellValue(row, col) {
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        return gridState[row][col];
    }
    return 0;
}

/**
 * Check if a cell is powered (green or protected)
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {boolean} - Whether the cell is powered (1 or 2)
 */
export function isCellPowered(row, col) {
    const value = getCellValue(row, col);
    return value === 1 || value === 2;
}

/**
 * Check if a cell is protected
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {boolean} - Whether the cell is protected (2)
 */
export function isCellProtected(row, col) {
    return getCellValue(row, col) === 2;
}

/**
 * Clear the entire grid (set all cells to unpowered)
 */
export function clearGrid() {
    gridState = createEmptyGrid();
    saveGridState();
}

/**
 * Set grid state from a template (8x8 array of 0s, 1s, and 2s)
 * @param {number[][]} template - 8x8 grid template
 */
export function setGridFromTemplate(template) {
    if (!Array.isArray(template) || template.length !== GRID_SIZE) {
        console.warn('Invalid template: must be 8x8 array');
        return;
    }
    
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            gridState[row][col] = template[row][col] || 0;
        }
    }
    saveGridState();
}

/**
 * Get all powered cells (both green and protected)
 * @returns {Array<{row: number, col: number, protected: boolean}>}
 */
export function getPoweredCells() {
    const cells = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const value = gridState[row][col];
            if (value === 1 || value === 2) {
                cells.push({ 
                    row, 
                    col, 
                    protected: value === 2 
                });
            }
        }
    }
    return cells;
}

/**
 * Get all protected cells
 * @returns {Array<{row: number, col: number}>}
 */
export function getProtectedCells() {
    const cells = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (gridState[row][col] === 2) {
                cells.push({ row, col });
            }
        }
    }
    return cells;
}

/**
 * Count powered cells
 * @returns {number} - Number of powered cells (1 or 2)
 */
export function countPoweredCells() {
    let count = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (gridState[row][col] === 1 || gridState[row][col] === 2) {
                count++;
            }
        }
    }
    return count;
}

/**
 * Count protected cells
 * @returns {number} - Number of protected cells (2)
 */
export function countProtectedCells() {
    let count = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (gridState[row][col] === 2) count++;
        }
    }
    return count;
}

/**
 * Set the solution state (placed components)
 * @param {Array} solution - Array of placement objects
 */
export function setSolution(solution) {
    solutionState = solution;
}

/**
 * Get the current solution state
 * @returns {Array} - Current solution
 */
export function getSolution() {
    return solutionState;
}

/**
 * Clear the solution
 */
export function clearSolution() {
    solutionState = [];
}

/**
 * Save grid state to localStorage
 */
function saveGridState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gridState));
    } catch (e) {
        console.warn('Could not save grid state to localStorage:', e);
    }
}

/**
 * Load grid state from localStorage
 */
function loadGridState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length === GRID_SIZE) {
                // Convert old boolean format to new number format
                gridState = parsed.map(row => 
                    row.map(cell => {
                        if (typeof cell === 'boolean') {
                            return cell ? 1 : 0;
                        }
                        return cell || 0;
                    })
                );
            }
        }
    } catch (e) {
        console.warn('Could not load grid state from localStorage:', e);
        gridState = createEmptyGrid();
    }
}

/**
 * Import grid state from a string (for sharing)
 * @param {string} stateString - Encoded grid state
 * @returns {boolean} - Whether import was successful
 */
export function importGridState(stateString) {
    try {
        const parsed = JSON.parse(stateString);
        if (Array.isArray(parsed) && parsed.length === GRID_SIZE) {
            gridState = parsed;
            saveGridState();
            return true;
        }
    } catch (e) {
        console.warn('Could not import grid state:', e);
    }
    return false;
}

/**
 * Export grid state to a string (for sharing)
 * @returns {string} - Encoded grid state
 */
export function exportGridState() {
    return JSON.stringify(gridState);
}

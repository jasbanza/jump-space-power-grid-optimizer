/**
 * Grid State Management for Power Grid Optimizer
 */

const GRID_SIZE = 8;
const STORAGE_KEY = 'jumpspace-grid-state';

// Grid state: 2D array where true = powered (green), false = unpowered (black)
let gridState = createEmptyGrid();

// Solution state: tracks which pieces are placed where
let solutionState = [];

/**
 * Create an empty 8x8 grid
 * @returns {boolean[][]} - Empty grid
 */
function createEmptyGrid() {
    return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
}

/**
 * Initialize the grid state (load from localStorage if available)
 */
export function initGrid() {
    loadGridState();
}

/**
 * Get the current grid state
 * @returns {boolean[][]} - Current grid state
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
 * Toggle a cell's powered state
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {boolean} - New state of the cell
 */
export function toggleCell(row, col) {
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        gridState[row][col] = !gridState[row][col];
        saveGridState();
        return gridState[row][col];
    }
    return false;
}

/**
 * Set a cell's powered state
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {boolean} powered - Whether the cell is powered
 */
export function setCell(row, col, powered) {
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        gridState[row][col] = powered;
        saveGridState();
    }
}

/**
 * Check if a cell is powered
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {boolean} - Whether the cell is powered
 */
export function isCellPowered(row, col) {
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        return gridState[row][col];
    }
    return false;
}

/**
 * Clear the entire grid (set all cells to unpowered)
 */
export function clearGrid() {
    gridState = createEmptyGrid();
    saveGridState();
}

/**
 * Get all powered cells
 * @returns {Array<{row: number, col: number}>} - Array of powered cell coordinates
 */
export function getPoweredCells() {
    const cells = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (gridState[row][col]) {
                cells.push({ row, col });
            }
        }
    }
    return cells;
}

/**
 * Count powered cells
 * @returns {number} - Number of powered cells
 */
export function countPoweredCells() {
    let count = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (gridState[row][col]) count++;
        }
    }
    return count;
}

/**
 * Set the solution state (placed pieces)
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
                gridState = parsed;
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

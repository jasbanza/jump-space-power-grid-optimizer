/**
 * Grid State Management for Power Grid Optimizer
 * 
 * Grid cell values (matching game encoding):
 * - 0 = powered/unprotected (green)
 * - 1 = protected (light blue - prioritized in solver)
 * - 4 = blocked/unpowered (black)
 */

const GRID_SIZE = 8;
const STORAGE_KEY = 'jumpspace-grid-state';

// Grid state: 2D array of cell values (0=powered, 1=protected, 4=blocked)
let gridState = createEmptyGrid();

// Solution state: tracks which components are placed where
let solutionState = [];

// Manual placements: components placed by drag-and-drop (not by solver)
let manualPlacements = [];

// All solutions found by solver (for multi-solution support)
let allSolutions = [];

/**
 * Create an empty 8x8 grid (all blocked)
 * @returns {number[][]} - Empty grid with all 4s (blocked)
 */
function createEmptyGrid() {
    return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(4));
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
 * Toggle a cell's state: 4 -> 0 -> 1 -> 4 (blocked -> powered -> protected -> blocked)
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {number} - New state of the cell
 */
export function toggleCell(row, col) {
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        // Cycle through: 4 (blocked) -> 0 (powered) -> 1 (protected) -> 4
        const current = gridState[row][col];
        if (current === 4) {
            gridState[row][col] = 0;  // blocked -> powered
        } else if (current === 0) {
            gridState[row][col] = 1;  // powered -> protected
        } else {
            gridState[row][col] = 4;  // protected -> blocked
        }
        saveGridState();
        return gridState[row][col];
    }
    return 4;
}

/**
 * Set a cell's state
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {number} value - Cell value (0, 1, or 4)
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
 * @returns {number} - Cell value (0, 1, or 4)
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
 * @returns {boolean} - Whether the cell is powered (0 or 1)
 */
export function isCellPowered(row, col) {
    const value = getCellValue(row, col);
    return value === 0 || value === 1;
}

/**
 * Check if a cell is protected
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {boolean} - Whether the cell is protected (1)
 */
export function isCellProtected(row, col) {
    return getCellValue(row, col) === 1;
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
            if (value === 0 || value === 1) {
                cells.push({ 
                    row, 
                    col, 
                    protected: value === 1 
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
            if (gridState[row][col] === 1) {
                cells.push({ row, col });
            }
        }
    }
    return cells;
}

/**
 * Count powered cells
 * @returns {number} - Number of powered cells (0 or 1)
 */
export function countPoweredCells() {
    let count = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (gridState[row][col] === 0 || gridState[row][col] === 1) {
                count++;
            }
        }
    }
    return count;
}

/**
 * Count protected cells
 * @returns {number} - Number of protected cells (1)
 */
export function countProtectedCells() {
    let count = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (gridState[row][col] === 1) count++;
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
 * Add a manual placement
 * @param {Object} placement - Placement object with priorityId, shape, row, col, cells, etc.
 */
export function addManualPlacement(placement) {
    // Remove any existing placement for this priority item
    manualPlacements = manualPlacements.filter(p => p.priorityId !== placement.priorityId);
    manualPlacements.push(placement);
}

/**
 * Remove a manual placement by priority ID
 * @param {string} priorityId - The priority ID to remove
 */
export function removeManualPlacement(priorityId) {
    manualPlacements = manualPlacements.filter(p => p.priorityId !== priorityId);
}

/**
 * Get all manual placements
 * @returns {Array} - Array of manual placement objects
 */
export function getManualPlacements() {
    return manualPlacements;
}

/**
 * Clear all manual placements
 */
export function clearManualPlacements() {
    manualPlacements = [];
}

/**
 * Check if a cell is occupied by any manual placement
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {boolean} - Whether the cell is occupied
 */
export function isManuallyOccupied(row, col) {
    for (const placement of manualPlacements) {
        for (const cell of placement.cells) {
            if (cell.row === row && cell.col === col) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Get all cells occupied by manual placements
 * @returns {Set<string>} - Set of "row,col" keys
 */
export function getManuallyOccupiedCells() {
    const occupied = new Set();
    for (const placement of manualPlacements) {
        for (const cell of placement.cells) {
            occupied.add(`${cell.row},${cell.col}`);
        }
    }
    return occupied;
}

/**
 * Set all solutions (for multi-solution support)
 * @param {Array} solutions - Array of solution objects
 */
export function setAllSolutions(solutions) {
    allSolutions = solutions;
}

/**
 * Get all solutions
 * @returns {Array} - All solutions
 */
export function getAllSolutions() {
    return allSolutions;
}

/**
 * Clear all solutions
 */
export function clearAllSolutions() {
    allSolutions = [];
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

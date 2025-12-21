/**
 * Backtracking Solver for Power Grid Optimization
 * 
 * Grid values:
 * - 0 = unpowered (cannot place)
 * - 1 = powered (can place)
 * - 2 = protected (can place, prioritized)
 * 
 * Priority-based solving:
 * - Components are placed in priority order (as defined by user)
 * - Mandatory components are attempted first
 * - If a component doesn't fit, it's skipped (tracked as not placed)
 */

import { getAllRotations, getOccupiedCells, countCells } from './components.js';

// Solver limits to prevent freezing
const MAX_BACKTRACK_ITERATIONS = 50000;
const MAX_MANDATORY_PIECES = 8; // Hard limit on mandatory pieces to prevent exponential blowup

/**
 * Check if a cell is powered (value 1 or 2)
 */
function isPowered(value) {
    return value === 1 || value === 2;
}

/**
 * Check if a piece can be placed at a given position
 * @param protectOnly - if true, only allow placement on protected cells (value 2)
 */
function canPlace(shape, startRow, startCol, gridState, occupiedCells, gridSize, protectOnly = false) {
    const cells = getOccupiedCells(shape, startRow, startCol);
    
    for (const cell of cells) {
        if (cell.row < 0 || cell.row >= gridSize || cell.col < 0 || cell.col >= gridSize) {
            return false;
        }
        const cellValue = gridState[cell.row][cell.col];
        
        // If protectOnly, require all cells to be protected (value 2)
        if (protectOnly) {
            if (cellValue !== 2) {
                return false;
            }
        } else {
            if (!isPowered(cellValue)) {
                return false;
            }
        }
        
        const key = `${cell.row},${cell.col}`;
        if (occupiedCells.has(key)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Count how many protected cells this placement would cover
 */
function countProtectedCells(shape, startRow, startCol, gridState) {
    const cells = getOccupiedCells(shape, startRow, startCol);
    let count = 0;
    
    for (const cell of cells) {
        if (gridState[cell.row]?.[cell.col] === 2) {
            count++;
        }
    }
    
    return count;
}

/**
 * Place a piece on the grid
 */
function placePiece(shape, startRow, startCol, occupiedCells) {
    const cells = getOccupiedCells(shape, startRow, startCol);
    const placed = [];
    
    for (const cell of cells) {
        const key = `${cell.row},${cell.col}`;
        occupiedCells.add(key);
        placed.push(key);
    }
    
    return placed;
}

/**
 * Remove a piece from the grid
 */
function removePiece(placedKeys, occupiedCells) {
    for (const key of placedKeys) {
        occupiedCells.delete(key);
    }
}

/**
 * Get all valid placements for a piece, sorted by protected cell coverage (descending)
 * @param protectOnly - if true, only allow placement on protected cells
 */
function getValidPlacements(piece, gridState, occupiedCells, gridSize, protectOnly = false) {
    const placements = [];
    const rotations = getAllRotations(piece.shape);
    
    for (let rotIdx = 0; rotIdx < rotations.length; rotIdx++) {
        const shape = rotations[rotIdx];
        const rows = shape.length;
        const cols = shape[0].length;
        
        for (let row = 0; row <= gridSize - rows; row++) {
            for (let col = 0; col <= gridSize - cols; col++) {
                if (canPlace(shape, row, col, gridState, occupiedCells, gridSize, protectOnly)) {
                    const protectedCount = countProtectedCells(shape, row, col, gridState);
                    placements.push({
                        shape,
                        row,
                        col,
                        rotIdx,
                        protectedCount
                    });
                }
            }
        }
    }
    
    // Sort by protected cell coverage (highest first)
    placements.sort((a, b) => b.protectedCount - a.protectedCount);
    
    return placements;
}

/**
 * Try to place a single piece, return placement or null
 */
function tryPlacePiece(piece, gridState, occupiedCells, gridSize) {
    const protectOnly = piece.protect || false;
    const validPlacements = getValidPlacements(piece, gridState, occupiedCells, gridSize, protectOnly);
    
    if (validPlacements.length === 0) {
        return null;
    }
    
    // Take the best placement (most protected cells)
    const best = validPlacements[0];
    const placedKeys = placePiece(best.shape, best.row, best.col, occupiedCells);
    
    return {
        pieceId: piece.id,
        priorityId: piece.priorityId,
        pieceName: piece.name,
        componentName: piece.componentName || piece.name,
        shape: best.shape,
        row: best.row,
        col: best.col,
        rotation: best.rotIdx * 90,
        cells: getOccupiedCells(best.shape, best.row, best.col),
        placedKeys
    };
}

/**
 * Try backtracking to fit mandatory pieces
 * Attempts to find a configuration where all mandatory pieces can fit
 * Uses iteration counter to prevent infinite loops
 */
function backtrackMandatory(mandatoryPieces, pieceIndex, gridState, occupiedCells, gridSize, placements, iterationCounter) {
    // Check iteration limit
    iterationCounter.count++;
    if (iterationCounter.count > MAX_BACKTRACK_ITERATIONS) {
        iterationCounter.exceeded = true;
        return null;
    }
    
    if (pieceIndex >= mandatoryPieces.length) {
        return [...placements];
    }
    
    const piece = mandatoryPieces[pieceIndex];
    const protectOnly = piece.protect || false;
    const validPlacements = getValidPlacements(piece, gridState, occupiedCells, gridSize, protectOnly);
    
    // Limit placements to try (reduce search space)
    const placementsToTry = validPlacements.slice(0, 20);
    
    for (const placement of placementsToTry) {
        // Check iteration limit before each placement attempt
        if (iterationCounter.count > MAX_BACKTRACK_ITERATIONS) {
            iterationCounter.exceeded = true;
            return null;
        }
        
        const placedKeys = placePiece(placement.shape, placement.row, placement.col, occupiedCells);
        placements.push({
            pieceId: piece.id,
            priorityId: piece.priorityId,
            pieceName: piece.name,
            componentName: piece.componentName || piece.name,
            shape: placement.shape,
            row: placement.row,
            col: placement.col,
            rotation: placement.rotIdx * 90,
            cells: getOccupiedCells(placement.shape, placement.row, placement.col),
            placedKeys
        });
        
        const result = backtrackMandatory(
            mandatoryPieces, pieceIndex + 1, gridState, occupiedCells, gridSize, placements, iterationCounter
        );
        
        if (result !== null) {
            return result;
        }
        
        removePiece(placedKeys, occupiedCells);
        placements.pop();
    }
    
    return null;
}

/**
 * Main solve function - priority-based solving
 * 
 * Algorithm:
 * 1. Separate mandatory and non-mandatory pieces
 * 2. Use backtracking to place all mandatory pieces
 * 3. Greedily place non-mandatory pieces in priority order
 * 4. Track which pieces were placed and which weren't
 */
export function solve(selectedPieces, gridState, gridSize) {
    if (selectedPieces.length === 0) {
        return {
            success: false,
            solution: [],
            message: 'No components selected'
        };
    }
    
    // Count powered and protected cells
    let poweredCount = 0;
    let protectedCount = 0;
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (gridState[r][c] === 1) poweredCount++;
            if (gridState[r][c] === 2) {
                poweredCount++;
                protectedCount++;
            }
        }
    }
    
    if (poweredCount === 0) {
        return {
            success: false,
            solution: [],
            message: 'No powered cells on the grid'
        };
    }
    
    // Separate mandatory and non-mandatory pieces, maintaining priority order
    const mandatoryPieces = selectedPieces.filter(p => p.mandatory);
    const optionalPieces = selectedPieces.filter(p => !p.mandatory);
    
    const occupiedCells = new Set();
    let solution = [];
    let mandatoryFailed = false;
    let timeoutWarning = '';
    
    // Check for too many mandatory pieces
    if (mandatoryPieces.length > MAX_MANDATORY_PIECES) {
        return {
            success: false,
            solution: [],
            message: `Too many mandatory components (${mandatoryPieces.length}). Maximum is ${MAX_MANDATORY_PIECES}. Reduce mandatory items or uncheck some.`
        };
    }
    
    // Step 1: Try to place all mandatory pieces using backtracking
    if (mandatoryPieces.length > 0) {
        const iterationCounter = { count: 0, exceeded: false };
        
        const mandatorySolution = backtrackMandatory(
            mandatoryPieces, 0, gridState, occupiedCells, gridSize, [], iterationCounter
        );
        
        if (iterationCounter.exceeded) {
            timeoutWarning = ' (search limit reached - try fewer mandatory items)';
        }
        
        if (mandatorySolution === null) {
            // Could not fit all mandatory pieces
            mandatoryFailed = true;
            
            // Fall back to greedy for mandatory pieces
            for (const piece of mandatoryPieces) {
                const placement = tryPlacePiece(piece, gridState, occupiedCells, gridSize);
                if (placement) {
                    solution.push(placement);
                }
            }
        } else {
            solution = mandatorySolution;
        }
    }
    
    // Step 2: Place non-mandatory pieces in priority order (greedy)
    for (const piece of optionalPieces) {
        const placement = tryPlacePiece(piece, gridState, occupiedCells, gridSize);
        if (placement) {
            solution.push(placement);
        }
    }
    
    // Calculate coverage stats
    let coveredCells = 0;
    let coveredProtected = 0;
    for (const placement of solution) {
        for (const cell of placement.cells) {
            coveredCells++;
            if (gridState[cell.row][cell.col] === 2) {
                coveredProtected++;
            }
        }
    }
    
    const componentsPlaced = solution.length;
    const totalComponents = selectedPieces.length;
    const mandatoryPlaced = solution.filter(p => 
        mandatoryPieces.some(m => m.priorityId === p.priorityId)
    ).length;
    const totalMandatory = mandatoryPieces.length;
    
    // Build message
    let message = `Placed ${componentsPlaced}/${totalComponents} components`;
    
    if (totalMandatory > 0) {
        if (mandatoryPlaced < totalMandatory) {
            message = `Warning: Only ${mandatoryPlaced}/${totalMandatory} mandatory components fit. `;
            message += `Total: ${componentsPlaced}/${totalComponents} placed`;
        } else {
            message += ` (all ${totalMandatory} mandatory)`;
        }
    }
    
    message += `, covering ${coveredCells}/${poweredCount} cells`;
    
    if (protectedCount > 0) {
        message += ` (${coveredProtected}/${protectedCount} protected)`;
    }
    
    // Add timeout warning if applicable
    message += timeoutWarning;
    
    return {
        success: componentsPlaced > 0,
        solution: solution,
        message: message,
        stats: {
            placed: componentsPlaced,
            total: totalComponents,
            mandatoryPlaced,
            totalMandatory,
            coveredCells,
            poweredCount,
            coveredProtected,
            protectedCount
        }
    };
}

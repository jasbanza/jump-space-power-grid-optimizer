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
 * - The solver tries to place ALL components first (no skipping)
 * - If not all fit, it allows skipping to maximize placements
 */

import { getAllRotations, getOccupiedCells, countCells } from './components.js';

// Solver limits to prevent freezing
const MAX_BACKTRACK_ITERATIONS = 50000;
const MAX_PIECES_FOR_BACKTRACK = 8; // Hard limit on pieces for backtracking to prevent exponential blowup

/**
 * Check if a cell is powered (value 1 or 2)
 */
function isPowered(value) {
    return value === 1 || value === 2;
}

/**
 * Check if a piece can be placed at a given position
 */
function canPlace(shape, startRow, startCol, gridState, occupiedCells, gridSize) {
    const cells = getOccupiedCells(shape, startRow, startCol);
    
    for (const cell of cells) {
        if (cell.row < 0 || cell.row >= gridSize || cell.col < 0 || cell.col >= gridSize) {
            return false;
        }
        const cellValue = gridState[cell.row][cell.col];
        
        if (!isPowered(cellValue)) {
            return false;
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
 * All components naturally prefer protected cells (blue squares)
 */
function getValidPlacements(piece, gridState, occupiedCells, gridSize) {
    const placements = [];
    const rotations = getAllRotations(piece.shape);
    
    for (let rotIdx = 0; rotIdx < rotations.length; rotIdx++) {
        const shape = rotations[rotIdx];
        const rows = shape.length;
        const cols = shape[0].length;
        
        for (let row = 0; row <= gridSize - rows; row++) {
            for (let col = 0; col <= gridSize - cols; col++) {
                if (canPlace(shape, row, col, gridState, occupiedCells, gridSize)) {
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
    // This ensures components naturally prefer protected cells
    placements.sort((a, b) => b.protectedCount - a.protectedCount);
    
    return placements;
}

/**
 * Try to place a single piece greedily, return placement or null
 */
function tryPlacePiece(piece, gridState, occupiedCells, gridSize) {
    const validPlacements = getValidPlacements(piece, gridState, occupiedCells, gridSize);
    
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
 * Backtracking to place ALL pieces (no skipping allowed)
 * Returns solution array if all pieces placed, null otherwise
 */
function backtrackStrict(pieces, pieceIndex, gridState, occupiedCells, gridSize, placements, iterationCounter) {
    iterationCounter.count++;
    if (iterationCounter.count > MAX_BACKTRACK_ITERATIONS) {
        iterationCounter.exceeded = true;
        return null;
    }
    
    if (pieceIndex >= pieces.length) {
        return [...placements];
    }
    
    const piece = pieces[pieceIndex];
    const validPlacements = getValidPlacements(piece, gridState, occupiedCells, gridSize);
    
    // Limit placements to try (reduce search space)
    const placementsToTry = validPlacements.slice(0, 20);
    
    for (const placement of placementsToTry) {
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
        
        const result = backtrackStrict(
            pieces, pieceIndex + 1, gridState, occupiedCells, gridSize, placements, iterationCounter
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
 * Backtracking that allows skipping pieces that don't fit
 * Maximizes number of pieces placed
 */
function backtrackAllowSkip(pieces, pieceIndex, gridState, occupiedCells, gridSize, placements, iterationCounter) {
    iterationCounter.count++;
    if (iterationCounter.count > MAX_BACKTRACK_ITERATIONS) {
        iterationCounter.exceeded = true;
        return null;
    }
    
    if (pieceIndex >= pieces.length) {
        return [...placements];
    }
    
    const piece = pieces[pieceIndex];
    const validPlacements = getValidPlacements(piece, gridState, occupiedCells, gridSize);
    
    // Limit placements to try
    const placementsToTry = validPlacements.slice(0, 15);
    
    for (const placement of placementsToTry) {
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
        
        const result = backtrackAllowSkip(
            pieces, pieceIndex + 1, gridState, occupiedCells, gridSize, placements, iterationCounter
        );
        
        if (result !== null) {
            return result;
        }
        
        removePiece(placedKeys, occupiedCells);
        placements.pop();
    }
    
    // If this piece can't be placed, skip it and continue
    return backtrackAllowSkip(
        pieces, pieceIndex + 1, gridState, occupiedCells, gridSize, placements, iterationCounter
    );
}

/**
 * Main solve function - priority-based solving
 * 
 * Algorithm:
 * 1. Try to place ALL pieces using backtracking (no skipping)
 * 2. If that fails, allow skipping to maximize placements
 * 3. Fall back to greedy if backtracking times out
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
    
    const occupiedCells = new Set();
    let solution = [];
    let timeoutWarning = '';
    
    const totalPieces = selectedPieces.length;
    const useBacktrack = totalPieces <= MAX_PIECES_FOR_BACKTRACK;
    
    if (useBacktrack) {
        const iterationCounter = { count: 0, exceeded: false };
        
        // Phase 1: Try to place ALL pieces (no skipping)
        const fullSolution = backtrackStrict(
            selectedPieces, 0, gridState, occupiedCells, gridSize, [], iterationCounter
        );
        
        if (fullSolution !== null) {
            // All pieces placed successfully!
            solution = fullSolution;
        } else {
            // Phase 2: Allow skipping to maximize placements
            occupiedCells.clear();
            iterationCounter.count = 0;
            iterationCounter.exceeded = false;
            
            const partialSolution = backtrackAllowSkip(
                selectedPieces, 0, gridState, occupiedCells, gridSize, [], iterationCounter
            );
            
            if (iterationCounter.exceeded) {
                timeoutWarning = ' (search limit reached)';
            }
            
            if (partialSolution !== null) {
                solution = partialSolution;
            } else {
                // Phase 3: Fall back to greedy
                occupiedCells.clear();
                for (const piece of selectedPieces) {
                    const placement = tryPlacePiece(piece, gridState, occupiedCells, gridSize);
                    if (placement) {
                        solution.push(placement);
                    }
                }
            }
        }
    } else {
        // Too many pieces for backtracking, use greedy
        for (const piece of selectedPieces) {
            const placement = tryPlacePiece(piece, gridState, occupiedCells, gridSize);
            if (placement) {
                solution.push(placement);
            }
        }
        if (totalPieces > MAX_PIECES_FOR_BACKTRACK) {
            timeoutWarning = ` (greedy mode - ${totalPieces} pieces exceeds backtrack limit of ${MAX_PIECES_FOR_BACKTRACK})`;
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
    
    // Build message
    let message = `Placed ${componentsPlaced}/${totalComponents} components`;
    message += `, covering ${coveredCells}/${poweredCount} cells`;
    
    if (protectedCount > 0) {
        message += ` (${coveredProtected}/${protectedCount} protected)`;
    }
    
    message += timeoutWarning;
    
    return {
        success: componentsPlaced > 0,
        solution: solution,
        message: message,
        stats: {
            placed: componentsPlaced,
            total: totalComponents,
            coveredCells,
            poweredCount,
            coveredProtected,
            protectedCount
        }
    };
}

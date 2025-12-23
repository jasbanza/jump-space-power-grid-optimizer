/**
 * Backtracking Solver for Power Grid Optimization
 * 
 * Grid values:
 * - 0 = unpowered (cannot place)
 * - 1 = powered (can place)
 * - 1 = protected (can place, prioritized)
 * - 4 = blocked (cannot place)
 * 
 * Priority-based solving:
 * - Components are placed in priority order (as defined by user)
 * - The solver tries to place ALL components first (no skipping)
 * - If not all fit, it allows skipping to maximize placements
 */

import { getAllRotations, getOccupiedCells, countCells } from './components.js';

// Solver limits to prevent freezing
const MAX_BACKTRACK_ITERATIONS = 100000;

/**
 * Check if a cell is powered (value 0 or 1)
 */
function isPowered(value) {
    return value === 0 || value === 1;
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
        if (gridState[cell.row]?.[cell.col] === 1) {
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
 * Score a solution based on protected cell coverage
 */
function scoreProtectedCoverage(solution, gridState) {
    let total = 0;
    for (const placement of solution) {
        for (const cell of placement.cells) {
            if (gridState[cell.row]?.[cell.col] === 1) {
                total++;
            }
        }
    }
    return total;
}

/**
 * Score a solution based on number of components with at least one protected cell
 */
function scoreShieldedComponents(solution, gridState) {
    let count = 0;
    for (const placement of solution) {
        let hasProtected = false;
        for (const cell of placement.cells) {
            if (gridState[cell.row]?.[cell.col] === 1) {
                hasProtected = true;
                break;
            }
        }
        if (hasProtected) count++;
    }
    return count;
}

/**
 * Score a solution based on priority order shielding (higher priority items weighted more)
 */
function scorePriorityShielding(solution, gridState, priorityOrder) {
    let score = 0;
    const priorityMap = new Map();
    priorityOrder.forEach((id, index) => {
        priorityMap.set(id, priorityOrder.length - index); // Higher weight for earlier items
    });
    
    for (const placement of solution) {
        let hasProtected = false;
        for (const cell of placement.cells) {
            if (gridState[cell.row]?.[cell.col] === 1) {
                hasProtected = true;
                break;
            }
        }
        if (hasProtected) {
            const weight = priorityMap.get(placement.priorityId) || 1;
            score += weight;
        }
    }
    return score;
}

/**
 * Check if two solutions are identical (same placements)
 */
function solutionsEqual(sol1, sol2) {
    if (sol1.length !== sol2.length) return false;
    
    const cells1 = new Set();
    for (const p of sol1) {
        for (const c of p.cells) {
            cells1.add(`${p.priorityId}:${c.row},${c.col}`);
        }
    }
    
    for (const p of sol2) {
        for (const c of p.cells) {
            if (!cells1.has(`${p.priorityId}:${c.row},${c.col}`)) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Find a single solution using the standard algorithm
 */
function findOneSolution(selectedPieces, gridState, gridSize) {
    const occupiedCells = new Set();
    let solution = [];
    let method = 'backtrack';
    
    const iterationCounter = { count: 0, exceeded: false };
    
    // Phase 1: Try to place ALL pieces (no skipping)
    const fullSolution = backtrackStrict(
        selectedPieces, 0, gridState, occupiedCells, gridSize, [], iterationCounter
    );
    
    if (fullSolution !== null) {
        solution = fullSolution;
    } else {
        // Phase 2: Allow skipping to maximize placements
        occupiedCells.clear();
        iterationCounter.count = 0;
        iterationCounter.exceeded = false;
        
        const partialSolution = backtrackAllowSkip(
            selectedPieces, 0, gridState, occupiedCells, gridSize, [], iterationCounter
        );
        
        if (partialSolution !== null) {
            solution = partialSolution;
            if (iterationCounter.exceeded) {
                method = 'backtrack-partial';
            }
        } else {
            // Phase 3: Fall back to greedy
            occupiedCells.clear();
            for (const piece of selectedPieces) {
                const placement = tryPlacePiece(piece, gridState, occupiedCells, gridSize);
                if (placement) {
                    solution.push(placement);
                }
            }
            method = 'greedy';
        }
    }
    
    return { solution, method };
}

/**
 * Main solve function - generates 4 distinct solution strategies
 * 
 * Strategies (in order):
 * 1. 🎯 Best Fit (default) - Just fit all components, ignore shielding
 * 2. ⭐ Priority Shielding - Shield high-priority items first (original order)
 * 3. 🛡️ Use All Protected Squares - Use as many protected cells as possible
 * 4. 🔒 Most Shielded Components - Maximize components with at least one protected cell
 */
export function solve(selectedPieces, gridState, gridSize) {
    if (selectedPieces.length === 0) {
        return {
            success: false,
            solution: [],
            solutions: [],
            message: 'No components selected'
        };
    }
    
    // Count powered and protected cells
    // Game encoding: 0 = powered, 1 = protected, 4 = blocked
    let poweredCount = 0;
    let protectedCount = 0;
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (gridState[r][c] === 0) {
                poweredCount++;  // Unprotected power
            } else if (gridState[r][c] === 1) {
                poweredCount++;
                protectedCount++;  // Protected power
            }
        }
    }
    
    if (poweredCount === 0) {
        return {
            success: false,
            solution: [],
            solutions: [],
            message: 'No powered cells on the grid'
        };
    }
    
    const priorityOrder = selectedPieces.map(p => p.priorityId);
    const allSolutions = [];
    let primarySolution = null;
    let primaryStats = null;
    let method = 'backtrack';
    
    // ================================================================
    // Strategy 1: 🎯 Best Fit (default)
    // Sort by size descending - Tetris-style packing, big pieces first
    // Ignores protected cell placement
    // ================================================================
    const bestFitPieces = [...selectedPieces].sort((a, b) => {
        const aCells = countCells(a.shape);
        const bCells = countCells(b.shape);
        return bCells - aCells;
    });
    
    const { solution: bestFitSolution, method: m1 } = findOneSolutionNoPriority(bestFitPieces, gridState, gridSize);
    if (bestFitSolution.length > 0) {
        const stats = calculateSolutionStats(bestFitSolution, gridState, selectedPieces.length, poweredCount, protectedCount);
        allSolutions.push({
            id: 'best-fit',
            title: `🎯 Best Fit (${stats.placed}/${stats.total} placed)`,
            tooltip: 'Focuses only on fitting all components, ignoring protected cell placement',
            solution: bestFitSolution,
            stats: stats,
            scores: {
                protected: scoreProtectedCoverage(bestFitSolution, gridState),
                shielded: scoreShieldedComponents(bestFitSolution, gridState),
                priority: scorePriorityShielding(bestFitSolution, gridState, priorityOrder)
            }
        });
        primarySolution = bestFitSolution;
        primaryStats = stats;
        method = m1;
    }
    
    // ================================================================
    // Strategy 2: ⭐ Priority Shielding
    // Keep original priority order - ensures high-priority items get first shot at protected cells
    // ================================================================
    const { solution: prioritySolution, method: m2 } = findOneSolution(selectedPieces, gridState, gridSize);
    if (prioritySolution.length > 0) {
        let isUnique = !solutionsEqual(prioritySolution, bestFitSolution);
        
        if (isUnique) {
            const stats = calculateSolutionStats(prioritySolution, gridState, selectedPieces.length, poweredCount, protectedCount);
            allSolutions.push({
                id: 'priority-shield',
                title: `⭐ Priority Shielding (${stats.shieldedComponents}/${stats.placed} shielded)`,
                tooltip: 'Places components in your priority order, giving higher-priority items first access to protected cells',
                solution: prioritySolution,
                stats: stats,
                scores: {
                    protected: scoreProtectedCoverage(prioritySolution, gridState),
                    shielded: scoreShieldedComponents(prioritySolution, gridState),
                    priority: scorePriorityShielding(prioritySolution, gridState, priorityOrder)
                }
            });
        }
        
        if (!primarySolution) {
            primarySolution = prioritySolution;
            primaryStats = calculateSolutionStats(prioritySolution, gridState, selectedPieces.length, poweredCount, protectedCount);
            method = m2;
        }
    }
    
    // ================================================================
    // Strategy 3: 🛡️ Use All Protected Squares
    // Sort larger pieces first - they cover more protected cells
    // ================================================================
    if (protectedCount > 0) {
        const maxProtectedPieces = [...selectedPieces].sort((a, b) => {
            const aCells = countCells(a.shape);
            const bCells = countCells(b.shape);
            return bCells - aCells;
        });
        
        const { solution: maxProtectedSolution } = findOneSolution(maxProtectedPieces, gridState, gridSize);
        if (maxProtectedSolution.length > 0) {
            let isUnique = true;
            for (const existing of allSolutions) {
                if (solutionsEqual(maxProtectedSolution, existing.solution)) {
                    isUnique = false;
                    break;
                }
            }
            
            if (isUnique) {
                const stats = calculateSolutionStats(maxProtectedSolution, gridState, selectedPieces.length, poweredCount, protectedCount);
                allSolutions.push({
                    id: 'use-all-protected',
                    title: `🛡️ Use All Protected Squares (${stats.coveredProtected}/${stats.protectedCount} cells)`,
                    tooltip: 'Maximizes the total number of protected cells covered by components',
                    solution: maxProtectedSolution,
                    stats: stats,
                    scores: {
                        protected: scoreProtectedCoverage(maxProtectedSolution, gridState),
                        shielded: scoreShieldedComponents(maxProtectedSolution, gridState),
                        priority: scorePriorityShielding(maxProtectedSolution, gridState, priorityOrder)
                    }
                });
            }
        }
    }
    
    // ================================================================
    // Strategy 4: 🔒 Most Shielded Components
    // Sort smaller pieces first - more components can fit on protected cells
    // ================================================================
    if (protectedCount > 0) {
        const mostShieldedPieces = [...selectedPieces].sort((a, b) => {
            const aCells = countCells(a.shape);
            const bCells = countCells(b.shape);
            return aCells - bCells;
        });
        
        const { solution: mostShieldedSolution } = findOneSolution(mostShieldedPieces, gridState, gridSize);
        if (mostShieldedSolution.length > 0) {
            let isUnique = true;
            for (const existing of allSolutions) {
                if (solutionsEqual(mostShieldedSolution, existing.solution)) {
                    isUnique = false;
                    break;
                }
            }
            
            if (isUnique) {
                const stats = calculateSolutionStats(mostShieldedSolution, gridState, selectedPieces.length, poweredCount, protectedCount);
                allSolutions.push({
                    id: 'most-shielded',
                    title: `🔒 Most Shielded Components (${stats.shieldedComponents}/${stats.placed} components)`,
                    tooltip: 'Maximizes the number of components that have at least one cell on a protected square',
                    solution: mostShieldedSolution,
                    stats: stats,
                    scores: {
                        protected: scoreProtectedCoverage(mostShieldedSolution, gridState),
                        shielded: scoreShieldedComponents(mostShieldedSolution, gridState),
                        priority: scorePriorityShielding(mostShieldedSolution, gridState, priorityOrder)
                    }
                });
            }
        }
    }
    
    // Fallback if no solutions found
    if (!primarySolution) {
        primarySolution = [];
        primaryStats = calculateSolutionStats([], gridState, selectedPieces.length, poweredCount, protectedCount);
    }
    
    // Build message
    let timeoutWarning = method === 'greedy' ? ' (greedy fallback)' : 
                         method === 'backtrack-partial' ? ' (search limit reached)' : '';
    
    let message = `Placed ${primaryStats.placed}/${primaryStats.total} components`;
    message += `, covering ${primaryStats.coveredCells}/${poweredCount} cells`;
    
    if (protectedCount > 0) {
        message += ` (${primaryStats.coveredProtected}/${protectedCount} protected)`;
    }
    
    if (allSolutions.length > 1) {
        message += ` | ${allSolutions.length} strategies found`;
    }
    
    message += timeoutWarning;
    
    return {
        success: primaryStats.placed > 0,
        solution: primarySolution,
        solutions: allSolutions,
        message: message,
        stats: primaryStats
    };
}

/**
 * Find a solution without prioritizing protected cells (for Best Fit strategy)
 */
function findOneSolutionNoPriority(selectedPieces, gridState, gridSize) {
    const occupiedCells = new Set();
    let solution = [];
    let method = 'backtrack';
    
    const iterationCounter = { count: 0, exceeded: false };
    
    // Use backtracking but without protected cell preference
    const fullSolution = backtrackStrictNoPriority(
        selectedPieces, 0, gridState, occupiedCells, gridSize, [], iterationCounter
    );
    
    if (fullSolution !== null) {
        solution = fullSolution;
    } else {
        // Fall back to greedy
        occupiedCells.clear();
        for (const piece of selectedPieces) {
            const placement = tryPlacePieceNoPriority(piece, gridState, occupiedCells, gridSize);
            if (placement) {
                solution.push(placement);
            }
        }
        method = 'greedy';
    }
    
    return { solution, method };
}

/**
 * Backtracking without protected cell priority
 */
function backtrackStrictNoPriority(pieces, pieceIndex, gridState, occupiedCells, gridSize, placements, iterationCounter) {
    iterationCounter.count++;
    if (iterationCounter.count > MAX_BACKTRACK_ITERATIONS) {
        iterationCounter.exceeded = true;
        return null;
    }
    
    if (pieceIndex >= pieces.length) {
        return [...placements];
    }
    
    const piece = pieces[pieceIndex];
    const validPlacements = getValidPlacementsNoPriority(piece, gridState, occupiedCells, gridSize);
    
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
        
        const result = backtrackStrictNoPriority(
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
 * Get valid placements without protected cell priority (random/arbitrary order)
 */
function getValidPlacementsNoPriority(piece, gridState, occupiedCells, gridSize) {
    const placements = [];
    const rotations = getAllRotations(piece.shape);
    
    for (let rotIdx = 0; rotIdx < rotations.length; rotIdx++) {
        const shape = rotations[rotIdx];
        const rows = shape.length;
        const cols = shape[0].length;
        
        for (let row = 0; row <= gridSize - rows; row++) {
            for (let col = 0; col <= gridSize - cols; col++) {
                if (canPlace(shape, row, col, gridState, occupiedCells, gridSize)) {
                    placements.push({
                        shape,
                        row,
                        col,
                        rotIdx
                    });
                }
            }
        }
    }
    
    // No sorting - just return in scan order
    return placements;
}

/**
 * Try to place a piece without protected cell priority
 */
function tryPlacePieceNoPriority(piece, gridState, occupiedCells, gridSize) {
    const validPlacements = getValidPlacementsNoPriority(piece, gridState, occupiedCells, gridSize);
    
    if (validPlacements.length === 0) {
        return null;
    }
    
    // Take the first valid placement
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
 * Calculate solution statistics
 */
function calculateSolutionStats(solution, gridState, totalComponents, poweredCount, protectedCount) {
    let coveredCells = 0;
    let coveredProtected = 0;
    let shieldedComponents = 0;
    
    for (const placement of solution) {
        let hasProtected = false;
        for (const cell of placement.cells) {
            coveredCells++;
            if (gridState[cell.row]?.[cell.col] === 1) {
                coveredProtected++;
                hasProtected = true;
            }
        }
        if (hasProtected) shieldedComponents++;
    }
    
    return {
        placed: solution.length,
        total: totalComponents,
        coveredCells,
        poweredCount,
        coveredProtected,
        protectedCount,
        shieldedComponents
    };
}

/**
 * Build a descriptive title for a solution
 */
function buildSolutionTitle(baseName, stats) {
    const parts = [baseName];
    
    if (stats.protectedCount > 0) {
        parts.push(`(${stats.coveredProtected}/${stats.protectedCount} protected)`);
    }
    
    if (stats.placed < stats.total) {
        parts.push(`[${stats.placed}/${stats.total}]`);
    }
    
    return parts.join(' ');
}

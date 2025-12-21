/**
 * Backtracking Solver for Power Grid Optimization
 * 
 * Grid values:
 * - 0 = unpowered (cannot place)
 * - 1 = powered (can place)
 * - 2 = protected (can place, prioritized)
 */

import { getAllRotations, getOccupiedCells, countCells } from './components.js';

/**
 * Check if a cell is powered (value 1 or 2)
 * @param {number} value - Cell value
 * @returns {boolean} - Whether cell is powered
 */
function isPowered(value) {
    return value === 1 || value === 2;
}

/**
 * Check if a piece can be placed at a given position
 * @param {number[][]} shape - The piece shape matrix
 * @param {number} startRow - Top-left row position
 * @param {number} startCol - Top-left column position
 * @param {number[][]} gridState - Current grid state
 * @param {Set<string>} occupiedCells - Set of already occupied cell keys "row,col"
 * @param {number} gridSize - Size of the grid
 * @returns {boolean} - Whether the piece can be placed
 */
function canPlace(shape, startRow, startCol, gridState, occupiedCells, gridSize) {
    const cells = getOccupiedCells(shape, startRow, startCol);
    
    for (const cell of cells) {
        // Check bounds
        if (cell.row < 0 || cell.row >= gridSize || cell.col < 0 || cell.col >= gridSize) {
            return false;
        }
        // Check if cell is powered (1 or 2)
        if (!isPowered(gridState[cell.row][cell.col])) {
            return false;
        }
        // Check if cell is already occupied by another piece
        const key = `${cell.row},${cell.col}`;
        if (occupiedCells.has(key)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Count how many protected cells this placement would cover
 * @param {number[][]} shape - The piece shape matrix
 * @param {number} startRow - Top-left row position
 * @param {number} startCol - Top-left column position
 * @param {number[][]} gridState - Current grid state
 * @returns {number} - Number of protected cells covered
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
 * Place a piece on the grid (mark cells as occupied)
 * @param {number[][]} shape - The piece shape matrix
 * @param {number} startRow - Top-left row position
 * @param {number} startCol - Top-left column position
 * @param {Set<string>} occupiedCells - Set of occupied cell keys
 * @returns {string[]} - Array of newly occupied cell keys
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
 * Remove a piece from the grid (unmark cells as occupied)
 * @param {string[]} placedKeys - Array of cell keys to remove
 * @param {Set<string>} occupiedCells - Set of occupied cell keys
 */
function removePiece(placedKeys, occupiedCells) {
    for (const key of placedKeys) {
        occupiedCells.delete(key);
    }
}

/**
 * Get all valid placements for a piece, sorted by protected cell coverage (descending)
 * @param {Object} piece - Piece object with shape
 * @param {number[][]} gridState - Grid state
 * @param {Set<string>} occupiedCells - Occupied cells
 * @param {number} gridSize - Grid size
 * @returns {Array} - Array of valid placements sorted by protected coverage
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
    placements.sort((a, b) => b.protectedCount - a.protectedCount);
    
    return placements;
}

/**
 * Backtracking solver - try to place all pieces
 * Prioritizes placements that cover protected cells
 * @param {Array} pieces - Array of piece objects with shapes
 * @param {number} pieceIndex - Current piece index
 * @param {number[][]} gridState - Grid state
 * @param {Set<string>} occupiedCells - Occupied cells
 * @param {number} gridSize - Grid size
 * @param {Array} placements - Current placements
 * @param {boolean} requireAll - Whether all pieces must be placed
 * @returns {Array|null} - Solution or null
 */
function backtrack(pieces, pieceIndex, gridState, occupiedCells, gridSize, placements, requireAll) {
    // Base case: all pieces placed
    if (pieceIndex >= pieces.length) {
        return [...placements];
    }
    
    const piece = pieces[pieceIndex];
    const validPlacements = getValidPlacements(piece, gridState, occupiedCells, gridSize);
    
    // Try each valid placement (sorted by protected coverage)
    for (const placement of validPlacements) {
        // Place the piece
        const placedKeys = placePiece(placement.shape, placement.row, placement.col, occupiedCells);
        placements.push({
            pieceId: piece.id,
            pieceName: piece.name,
            componentName: piece.componentName || piece.name,
            shape: placement.shape,
            row: placement.row,
            col: placement.col,
            rotation: placement.rotIdx * 90,
            cells: getOccupiedCells(placement.shape, placement.row, placement.col)
        });
        
        // Recurse
        const result = backtrack(
            pieces, pieceIndex + 1, gridState, occupiedCells, 
            gridSize, placements, requireAll
        );
        
        if (result !== null) {
            return result;
        }
        
        // Backtrack
        removePiece(placedKeys, occupiedCells);
        placements.pop();
    }
    
    // If we're in maximize mode and couldn't place this piece, try skipping it
    if (!requireAll) {
        return backtrack(
            pieces, pieceIndex + 1, gridState, occupiedCells,
            gridSize, placements, requireAll
        );
    }
    
    return null;
}

/**
 * Find the best solution (maximize coverage, prioritize protected cells)
 * @param {Array} pieces - Array of piece objects
 * @param {number[][]} gridState - Grid state
 * @param {number} gridSize - Grid size
 * @returns {Array} - Best solution found
 */
function findBestSolution(pieces, gridState, gridSize) {
    let bestSolution = [];
    let bestScore = 0; // Score = protectedCovered * 1000 + totalCovered
    
    // Sort pieces by size (largest first) for better results
    const sortedPieces = [...pieces].sort((a, b) => {
        return countCells(b.shape) - countCells(a.shape);
    });
    
    // Try all subsets of pieces (for small numbers of pieces)
    if (pieces.length <= 10) {
        const permutations = getPermutations(sortedPieces);
        
        for (const perm of permutations) {
            const occupiedCells = new Set();
            const placements = [];
            let protectedCovered = 0;
            
            for (const piece of perm) {
                const validPlacements = getValidPlacements(piece, gridState, occupiedCells, gridSize);
                
                if (validPlacements.length > 0) {
                    // Take the placement with most protected cells
                    const best = validPlacements[0];
                    placePiece(best.shape, best.row, best.col, occupiedCells);
                    protectedCovered += best.protectedCount;
                    placements.push({
                        pieceId: piece.id,
                        pieceName: piece.name,
                        componentName: piece.componentName || piece.name,
                        shape: best.shape,
                        row: best.row,
                        col: best.col,
                        rotation: best.rotIdx * 90,
                        cells: getOccupiedCells(best.shape, best.row, best.col)
                    });
                }
            }
            
            const score = protectedCovered * 1000 + occupiedCells.size;
            if (score > bestScore) {
                bestScore = score;
                bestSolution = [...placements];
            }
        }
    } else {
        // Greedy approach for larger piece sets
        const occupiedCells = new Set();
        
        for (const piece of sortedPieces) {
            const validPlacements = getValidPlacements(piece, gridState, occupiedCells, gridSize);
            
            if (validPlacements.length > 0) {
                const best = validPlacements[0];
                placePiece(best.shape, best.row, best.col, occupiedCells);
                bestSolution.push({
                    pieceId: piece.id,
                    pieceName: piece.name,
                    componentName: piece.componentName || piece.name,
                    shape: best.shape,
                    row: best.row,
                    col: best.col,
                    rotation: best.rotIdx * 90,
                    cells: getOccupiedCells(best.shape, best.row, best.col)
                });
            }
        }
    }
    
    return bestSolution;
}

/**
 * Generate permutations of an array (limited to avoid explosion)
 * @param {Array} arr - Input array
 * @returns {Array} - Array of permutations
 */
function getPermutations(arr) {
    if (arr.length <= 1) return [arr];
    if (arr.length > 8) {
        // Too many permutations, return just a few orderings
        const result = [arr];
        const reversed = [...arr].reverse();
        result.push(reversed);
        // Shuffle a few times
        for (let i = 0; i < 5; i++) {
            const shuffled = [...arr].sort(() => Math.random() - 0.5);
            result.push(shuffled);
        }
        return result;
    }
    
    const result = [];
    
    function permute(current, remaining) {
        if (remaining.length === 0) {
            result.push(current);
            return;
        }
        for (let i = 0; i < remaining.length; i++) {
            const next = [...current, remaining[i]];
            const rest = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
            permute(next, rest);
        }
    }
    
    permute([], arr);
    return result;
}

/**
 * Main solve function
 * @param {Array} selectedPieces - Array of selected piece objects
 * @param {number[][]} gridState - Grid state (0=unpowered, 1=powered, 2=protected)
 * @param {number} gridSize - Size of the grid
 * @param {boolean} requireAll - Whether all pieces must be placed
 * @returns {{success: boolean, solution: Array, message: string}}
 */
export function solve(selectedPieces, gridState, gridSize, requireAll) {
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
    
    // Count total cells needed by selected pieces
    let totalPieceCells = 0;
    for (const piece of selectedPieces) {
        totalPieceCells += countCells(piece.shape);
    }
    
    if (requireAll && totalPieceCells > poweredCount) {
        return {
            success: false,
            solution: [],
            message: `Selected components need ${totalPieceCells} cells, but only ${poweredCount} powered cells available`
        };
    }
    
    let solution;
    
    if (requireAll) {
        // Use backtracking to find exact solution
        const occupiedCells = new Set();
        solution = backtrack(
            selectedPieces, 0, gridState, occupiedCells, 
            gridSize, [], true
        );
        
        if (solution === null) {
            return {
                success: false,
                solution: [],
                message: 'No solution found - components cannot all fit on the powered cells'
            };
        }
    } else {
        // Maximize coverage
        solution = findBestSolution(selectedPieces, gridState, gridSize);
    }
    
    // Calculate coverage
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
    
    let message = `Placed ${componentsPlaced}/${totalComponents} components, covering ${coveredCells}/${poweredCount} cells`;
    if (protectedCount > 0) {
        message += ` (${coveredProtected}/${protectedCount} protected)`;
    }
    
    return {
        success: true,
        solution: solution,
        message: message
    };
}

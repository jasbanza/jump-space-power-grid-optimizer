/**
 * Backtracking Solver for Power Grid Optimization
 */

import { getAllRotations, getOccupiedCells, countCells } from './pieces.js';

/**
 * Check if a piece can be placed at a given position
 * @param {number[][]} shape - The piece shape matrix
 * @param {number} startRow - Top-left row position
 * @param {number} startCol - Top-left column position
 * @param {boolean[][]} gridState - Current grid state (powered cells)
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
        // Check if cell is powered (green)
        if (!gridState[cell.row][cell.col]) {
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
 * Backtracking solver - try to place all pieces
 * @param {Array} pieces - Array of piece objects with shapes
 * @param {number} pieceIndex - Current piece index
 * @param {boolean[][]} gridState - Grid state
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
    const rotations = getAllRotations(piece.shape);
    
    // Try each rotation
    for (let rotIdx = 0; rotIdx < rotations.length; rotIdx++) {
        const shape = rotations[rotIdx];
        const rows = shape.length;
        const cols = shape[0].length;
        
        // Try each position
        for (let row = 0; row <= gridSize - rows; row++) {
            for (let col = 0; col <= gridSize - cols; col++) {
                if (canPlace(shape, row, col, gridState, occupiedCells, gridSize)) {
                    // Place the piece
                    const placedKeys = placePiece(shape, row, col, occupiedCells);
                    placements.push({
                        pieceId: piece.id,
                        pieceName: piece.name,
                        shape: shape,
                        row: row,
                        col: col,
                        rotation: rotIdx * 90,
                        cells: getOccupiedCells(shape, row, col)
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
            }
        }
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
 * Find the best solution (maximize coverage)
 * @param {Array} pieces - Array of piece objects
 * @param {boolean[][]} gridState - Grid state
 * @param {number} gridSize - Grid size
 * @returns {Array} - Best solution found
 */
function findBestSolution(pieces, gridState, gridSize) {
    let bestSolution = [];
    let bestCoverage = 0;
    
    // Sort pieces by size (largest first) for better results
    const sortedPieces = [...pieces].sort((a, b) => {
        return countCells(b.shape) - countCells(a.shape);
    });
    
    // Try all subsets of pieces (for small numbers of pieces)
    // For larger sets, use greedy approach with backtracking
    if (pieces.length <= 10) {
        // Generate all permutations and try each
        const permutations = getPermutations(sortedPieces);
        
        for (const perm of permutations) {
            const occupiedCells = new Set();
            const placements = [];
            
            for (const piece of perm) {
                const rotations = getAllRotations(piece.shape);
                let placed = false;
                
                for (let rotIdx = 0; rotIdx < rotations.length && !placed; rotIdx++) {
                    const shape = rotations[rotIdx];
                    const rows = shape.length;
                    const cols = shape[0].length;
                    
                    for (let row = 0; row <= gridSize - rows && !placed; row++) {
                        for (let col = 0; col <= gridSize - cols && !placed; col++) {
                            if (canPlace(shape, row, col, gridState, occupiedCells, gridSize)) {
                                const placedKeys = placePiece(shape, row, col, occupiedCells);
                                placements.push({
                                    pieceId: piece.id,
                                    pieceName: piece.name,
                                    shape: shape,
                                    row: row,
                                    col: col,
                                    rotation: rotIdx * 90,
                                    cells: getOccupiedCells(shape, row, col)
                                });
                                placed = true;
                            }
                        }
                    }
                }
            }
            
            const coverage = occupiedCells.size;
            if (coverage > bestCoverage) {
                bestCoverage = coverage;
                bestSolution = [...placements];
            }
        }
    } else {
        // Greedy approach for larger piece sets
        const occupiedCells = new Set();
        
        for (const piece of sortedPieces) {
            const rotations = getAllRotations(piece.shape);
            let placed = false;
            
            for (let rotIdx = 0; rotIdx < rotations.length && !placed; rotIdx++) {
                const shape = rotations[rotIdx];
                const rows = shape.length;
                const cols = shape[0].length;
                
                for (let row = 0; row <= gridSize - rows && !placed; row++) {
                    for (let col = 0; col <= gridSize - cols && !placed; col++) {
                        if (canPlace(shape, row, col, gridState, occupiedCells, gridSize)) {
                            placePiece(shape, row, col, occupiedCells);
                            bestSolution.push({
                                pieceId: piece.id,
                                pieceName: piece.name,
                                shape: shape,
                                row: row,
                                col: col,
                                rotation: rotIdx * 90,
                                cells: getOccupiedCells(shape, row, col)
                            });
                            placed = true;
                        }
                    }
                }
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
 * @param {boolean[][]} gridState - Grid state (powered cells)
 * @param {number} gridSize - Size of the grid
 * @param {boolean} requireAll - Whether all pieces must be placed
 * @returns {{success: boolean, solution: Array, message: string}}
 */
export function solve(selectedPieces, gridState, gridSize, requireAll) {
    if (selectedPieces.length === 0) {
        return {
            success: false,
            solution: [],
            message: 'No pieces selected'
        };
    }
    
    // Count powered cells
    let poweredCount = 0;
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (gridState[r][c]) poweredCount++;
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
            message: `Selected pieces need ${totalPieceCells} cells, but only ${poweredCount} powered cells available`
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
                message: 'No solution found - pieces cannot all fit on the powered cells'
            };
        }
    } else {
        // Maximize coverage
        solution = findBestSolution(selectedPieces, gridState, gridSize);
    }
    
    // Calculate coverage
    let coveredCells = 0;
    for (const placement of solution) {
        coveredCells += placement.cells.length;
    }
    
    const piecesPlaced = solution.length;
    const totalPieces = selectedPieces.length;
    
    return {
        success: true,
        solution: solution,
        message: `Placed ${piecesPlaced}/${totalPieces} pieces, covering ${coveredCells}/${poweredCount} powered cells`
    };
}

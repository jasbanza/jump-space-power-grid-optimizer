/**
 * Piece Definitions for Jump Space Power Grid
 * 
 * Each piece is defined as a 2D array where:
 * - 1 = filled cell
 * - 0 = empty cell
 * 
 * Pieces can be rotated in 90-degree increments (0, 90, 180, 270)
 */

export const PIECES = {
    // Standard Tetris-like shapes (placeholders - update with actual game pieces)
    iShape: {
        id: 'iShape',
        name: 'I-Shape (4)',
        shape: [
            [1, 1, 1, 1]
        ]
    },
    oShape: {
        id: 'oShape',
        name: 'O-Shape (2x2)',
        shape: [
            [1, 1],
            [1, 1]
        ]
    },
    tShape: {
        id: 'tShape',
        name: 'T-Shape',
        shape: [
            [1, 1, 1],
            [0, 1, 0]
        ]
    },
    lShape: {
        id: 'lShape',
        name: 'L-Shape',
        shape: [
            [1, 0],
            [1, 0],
            [1, 1]
        ]
    },
    jShape: {
        id: 'jShape',
        name: 'J-Shape',
        shape: [
            [0, 1],
            [0, 1],
            [1, 1]
        ]
    },
    sShape: {
        id: 'sShape',
        name: 'S-Shape',
        shape: [
            [0, 1, 1],
            [1, 1, 0]
        ]
    },
    zShape: {
        id: 'zShape',
        name: 'Z-Shape',
        shape: [
            [1, 1, 0],
            [0, 1, 1]
        ]
    },
    // Additional shapes
    single: {
        id: 'single',
        name: 'Single (1x1)',
        shape: [
            [1]
        ]
    },
    domino: {
        id: 'domino',
        name: 'Domino (1x2)',
        shape: [
            [1, 1]
        ]
    },
    triLine: {
        id: 'triLine',
        name: 'Tri-Line (1x3)',
        shape: [
            [1, 1, 1]
        ]
    },
    corner: {
        id: 'corner',
        name: 'Corner (2x2 L)',
        shape: [
            [1, 0],
            [1, 1]
        ]
    },
    plus: {
        id: 'plus',
        name: 'Plus',
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 1, 0]
        ]
    },
    uShape: {
        id: 'uShape',
        name: 'U-Shape',
        shape: [
            [1, 0, 1],
            [1, 0, 1],
            [1, 1, 1]
        ]
    }
};

/**
 * Rotate a piece shape 90 degrees clockwise
 * @param {number[][]} shape - The piece shape matrix
 * @returns {number[][]} - Rotated shape
 */
export function rotateShape(shape) {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated = [];
    
    for (let col = 0; col < cols; col++) {
        const newRow = [];
        for (let row = rows - 1; row >= 0; row--) {
            newRow.push(shape[row][col]);
        }
        rotated.push(newRow);
    }
    
    return rotated;
}

/**
 * Get all 4 rotations of a piece shape
 * @param {number[][]} shape - The piece shape matrix
 * @returns {number[][][]} - Array of 4 rotations
 */
export function getAllRotations(shape) {
    const rotations = [shape];
    let current = shape;
    
    for (let i = 0; i < 3; i++) {
        current = rotateShape(current);
        rotations.push(current);
    }
    
    return rotations;
}

/**
 * Get the cells occupied by a piece at a given position and rotation
 * @param {number[][]} shape - The piece shape matrix
 * @param {number} startRow - Top-left row position
 * @param {number} startCol - Top-left column position
 * @returns {Array<{row: number, col: number}>} - Array of occupied cell coordinates
 */
export function getOccupiedCells(shape, startRow, startCol) {
    const cells = [];
    
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] === 1) {
                cells.push({
                    row: startRow + r,
                    col: startCol + c
                });
            }
        }
    }
    
    return cells;
}

/**
 * Count the number of filled cells in a piece
 * @param {number[][]} shape - The piece shape matrix
 * @returns {number} - Number of filled cells
 */
export function countCells(shape) {
    let count = 0;
    for (const row of shape) {
        for (const cell of row) {
            if (cell === 1) count++;
        }
    }
    return count;
}

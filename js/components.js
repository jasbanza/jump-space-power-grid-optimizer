/**
 * Component Definitions for Jump Space Power Grid
 * 
 * Components are loaded from data/components.json
 * Each component has tiers with different shapes
 * 
 * Shape format: 2D array where 1 = filled cell, 0 = empty cell
 * Components can be rotated in 90-degree increments
 */

// Components data loaded from JSON
let COMPONENTS = {};

/**
 * Load components from JSON file
 * @returns {Promise<Object>} - Components object
 */
export async function loadComponents() {
    try {
        const response = await fetch('data/components.json');
        COMPONENTS = await response.json();
        return COMPONENTS;
    } catch (error) {
        console.error('Failed to load components:', error);
        return {};
    }
}

/**
 * Get all components
 * @returns {Object} - All components
 */
export function getComponents() {
    return COMPONENTS;
}

/**
 * Get a specific component by ID
 * @param {string} componentId - Component ID
 * @returns {Object|null} - Component or null
 */
export function getComponent(componentId) {
    return COMPONENTS[componentId] || null;
}

/**
 * Get a specific tier shape for a component
 * @param {string} componentId - Component ID
 * @param {string|number} tier - Tier number
 * @returns {number[][]|null} - Shape array or null
 */
export function getComponentTierShape(componentId, tier) {
    const component = COMPONENTS[componentId];
    if (!component || !component.tiers || !component.tiers[tier]) {
        return null;
    }
    return component.tiers[tier].shape;
}

/**
 * Get all tiers for a component
 * @param {string} componentId - Component ID
 * @returns {Object|null} - Tiers object or null
 */
export function getComponentTiers(componentId) {
    const component = COMPONENTS[componentId];
    return component ? component.tiers : null;
}

/**
 * Get flattened list of all component-tier combinations
 * @returns {Array} - Array of {componentId, componentName, tier, shape, blockCount}
 */
export function getFlattenedComponents() {
    const flattened = [];
    for (const [componentId, component] of Object.entries(COMPONENTS)) {
        for (const [tier, tierData] of Object.entries(component.tiers)) {
            flattened.push({
                componentId,
                componentName: component.name,
                tier: tier,
                shape: tierData.shape,
                blockCount: countCells(tierData.shape)
            });
        }
    }
    return flattened;
}

/**
 * Rotate a shape 90 degrees clockwise
 * @param {number[][]} shape - The shape matrix
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
 * Get all 4 rotations of a shape
 * @param {number[][]} shape - The shape matrix
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
 * Get the cells occupied by a shape at a given position
 * @param {number[][]} shape - The shape matrix
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
 * Count the number of filled cells in a shape
 * @param {number[][]} shape - The shape matrix
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

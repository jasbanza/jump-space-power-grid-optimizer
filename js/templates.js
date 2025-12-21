/**
 * Grid Templates for Jump Space Power Grid
 * 
 * Grid is composed of:
 * - Reactor (8x4 top half)
 * - Aux Generator 1 (8x2)
 * - Aux Generator 2 (8x2)
 * 
 * Grid values:
 * - 0 = unpowered (black)
 * - 1 = powered (green)
 * - 2 = protected (light blue - prioritized in solver)
 */

// Data loaded from JSON files
let REACTORS = {};
let AUX_GENERATORS = {};

/**
 * Load reactors and aux generators from JSON files
 * @returns {Promise<void>}
 */
export async function loadTemplates() {
    try {
        const [reactorsRes, auxRes] = await Promise.all([
            fetch('data/reactors.json'),
            fetch('data/auxGenerators.json')
        ]);
        REACTORS = await reactorsRes.json();
        AUX_GENERATORS = await auxRes.json();
    } catch (error) {
        console.error('Failed to load templates:', error);
    }
}

/**
 * Get all reactors
 * @returns {Object} - All reactors
 */
export function getReactors() {
    return REACTORS;
}

/**
 * Get reactor by ID
 * @param {string} reactorId - Reactor ID
 * @returns {Object|null} - Reactor object or null
 */
export function getReactor(reactorId) {
    return REACTORS[reactorId] || null;
}

/**
 * Get all reactor IDs and names for display
 * @returns {Array<{id: string, name: string}>}
 */
export function getReactorList() {
    return Object.values(REACTORS).map(r => ({
        id: r.id,
        name: r.name,
        powerGeneration: r.powerGeneration,
        protectedPower: r.protectedPower,
        unprotectedPower: r.unprotectedPower
    }));
}

/**
 * Get all aux generators
 * @returns {Object} - All aux generators
 */
export function getAuxGenerators() {
    return AUX_GENERATORS;
}

/**
 * Get aux generator by ID
 * @param {string} auxId - Aux generator ID
 * @returns {Object|null} - Aux generator object or null
 */
export function getAuxGenerator(auxId) {
    return AUX_GENERATORS[auxId] || null;
}

/**
 * Get all aux generator IDs and names for display
 * @returns {Array<{id: string, name: string}>}
 */
export function getAuxGeneratorList() {
    return Object.values(AUX_GENERATORS).map(a => ({
        id: a.id,
        name: a.name,
        powerGeneration: a.powerGeneration,
        protectedPower: a.protectedPower,
        unprotectedPower: a.unprotectedPower
    }));
}

/**
 * Combine reactor and aux generators into a full 8x8 grid
 * @param {string} reactorId - Reactor ID
 * @param {string} aux1Id - First aux generator ID (or 'none')
 * @param {string} aux2Id - Second aux generator ID (or 'none')
 * @returns {number[][]} - Combined 8x8 grid
 */
export function combineGrid(reactorId, aux1Id, aux2Id) {
    const reactor = REACTORS[reactorId];
    const aux1 = AUX_GENERATORS[aux1Id] || AUX_GENERATORS['none'];
    const aux2 = AUX_GENERATORS[aux2Id] || AUX_GENERATORS['none'];
    
    if (!reactor) {
        // Return empty 8x8 grid if no reactor selected
        return Array(8).fill(null).map(() => Array(8).fill(0));
    }
    
    // Combine: reactor (4 rows) + aux1 (2 rows) + aux2 (2 rows)
    const grid = [
        ...reactor.grid.map(row => [...row]),
        ...aux1.grid.map(row => [...row]),
        ...aux2.grid.map(row => [...row])
    ];
    
    return grid;
}

/**
 * Get power stats for a grid configuration
 * @param {string} reactorId - Reactor ID
 * @param {string} aux1Id - First aux generator ID
 * @param {string} aux2Id - Second aux generator ID
 * @returns {{total: number, protected: number, unprotected: number}}
 */
export function getGridStats(reactorId, aux1Id, aux2Id) {
    const reactor = REACTORS[reactorId];
    const aux1 = AUX_GENERATORS[aux1Id] || AUX_GENERATORS['none'];
    const aux2 = AUX_GENERATORS[aux2Id] || AUX_GENERATORS['none'];
    
    const stats = {
        total: 0,
        protected: 0,
        unprotected: 0
    };
    
    if (reactor) {
        stats.total += reactor.powerGeneration;
        stats.protected += reactor.protectedPower;
        stats.unprotected += reactor.unprotectedPower;
    }
    
    if (aux1) {
        stats.total += aux1.powerGeneration;
        stats.protected += aux1.protectedPower;
        stats.unprotected += aux1.unprotectedPower;
    }
    
    if (aux2) {
        stats.total += aux2.powerGeneration;
        stats.protected += aux2.protectedPower;
        stats.unprotected += aux2.unprotectedPower;
    }
    
    return stats;
}

/**
 * Check if a cell value represents a powered cell (green or protected)
 * @param {number} value - Cell value
 * @returns {boolean} - True if powered (1 or 2)
 */
export function isPoweredCell(value) {
    return value === 1 || value === 2;
}

/**
 * Check if a cell value represents a protected cell
 * @param {number} value - Cell value
 * @returns {boolean} - True if protected (2)
 */
export function isProtectedCell(value) {
    return value === 2;
}

// Legacy support - keep getTemplates for backwards compatibility
export function getTemplates() {
    return REACTORS;
}

export function getTemplateList() {
    return getReactorList();
}

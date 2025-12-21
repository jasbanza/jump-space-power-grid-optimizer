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
 * Get reactor tier data
 * @param {string} reactorId - Reactor ID
 * @param {string} tier - Tier number (e.g., "1", "2")
 * @returns {Object|null} - Tier data or null
 */
export function getReactorTier(reactorId, tier) {
    const reactor = REACTORS[reactorId];
    if (!reactor || !reactor.tiers) return null;
    return reactor.tiers[tier] || null;
}

/**
 * Get all tiers for a reactor
 * @param {string} reactorId - Reactor ID
 * @returns {Object} - Tiers object or empty
 */
export function getReactorTiers(reactorId) {
    const reactor = REACTORS[reactorId];
    return reactor?.tiers || {};
}

/**
 * Get all reactor IDs and names for display (flattened by tier)
 * @returns {Array<{id: string, tier: string, name: string, displayName: string, ...}>}
 */
export function getReactorList() {
    const list = [];
    for (const reactor of Object.values(REACTORS)) {
        const tiers = Object.keys(reactor.tiers || {});
        for (const tier of tiers) {
            const tierData = reactor.tiers[tier];
            list.push({
                id: reactor.id,
                tier: tier,
                name: reactor.name,
                displayName: tiers.length > 1 ? `${reactor.name} Mk ${tier}` : reactor.name,
                powerGeneration: tierData.powerGeneration,
                protectedPower: tierData.protectedPower,
                unprotectedPower: tierData.unprotectedPower,
                grid: tierData.grid
            });
        }
    }
    return list;
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
 * Get aux generator tier data
 * @param {string} auxId - Aux generator ID
 * @param {string} tier - Tier number
 * @returns {Object|null} - Tier data or null
 */
export function getAuxGeneratorTier(auxId, tier) {
    const aux = AUX_GENERATORS[auxId];
    if (!aux || !aux.tiers) return null;
    return aux.tiers[tier] || null;
}

/**
 * Get all tiers for an aux generator
 * @param {string} auxId - Aux generator ID
 * @returns {Object} - Tiers object or empty
 */
export function getAuxGeneratorTiers(auxId) {
    const aux = AUX_GENERATORS[auxId];
    return aux?.tiers || {};
}

/**
 * Get all aux generator IDs and names for display (flattened by tier)
 * @returns {Array<{id: string, tier: string, name: string, displayName: string, ...}>}
 */
export function getAuxGeneratorList() {
    const list = [];
    for (const aux of Object.values(AUX_GENERATORS)) {
        const tiers = Object.keys(aux.tiers || {});
        for (const tier of tiers) {
            const tierData = aux.tiers[tier];
            // For "none", don't show tier
            const displayName = aux.id === 'none' 
                ? aux.name 
                : (tiers.length > 1 ? `${aux.name} Mk ${tier}` : aux.name);
            list.push({
                id: aux.id,
                tier: tier,
                name: aux.name,
                displayName: displayName,
                powerGeneration: tierData.powerGeneration,
                protectedPower: tierData.protectedPower,
                unprotectedPower: tierData.unprotectedPower,
                grid: tierData.grid
            });
        }
    }
    return list;
}

/**
 * Combine reactor and aux generators into a full 8x8 grid
 * @param {string} reactorId - Reactor ID
 * @param {string} reactorTier - Reactor tier (default "1")
 * @param {string} aux1Id - First aux generator ID (or 'none')
 * @param {string} aux1Tier - Aux 1 tier (default "1")
 * @param {string} aux2Id - Second aux generator ID (or 'none')
 * @param {string} aux2Tier - Aux 2 tier (default "1")
 * @returns {number[][]} - Combined 8x8 grid
 */
export function combineGrid(reactorId, reactorTier = '1', aux1Id = 'none', aux1Tier = '1', aux2Id = 'none', aux2Tier = '1') {
    const reactorData = getReactorTier(reactorId, reactorTier);
    const aux1Data = getAuxGeneratorTier(aux1Id, aux1Tier) || getAuxGeneratorTier('none', '1');
    const aux2Data = getAuxGeneratorTier(aux2Id, aux2Tier) || getAuxGeneratorTier('none', '1');
    
    if (!reactorData) {
        // Return empty 8x8 grid if no reactor selected
        return Array(8).fill(null).map(() => Array(8).fill(0));
    }
    
    // Combine: reactor (4 rows) + aux1 (2 rows) + aux2 (2 rows)
    const grid = [
        ...reactorData.grid.map(row => [...row]),
        ...aux1Data.grid.map(row => [...row]),
        ...aux2Data.grid.map(row => [...row])
    ];
    
    return grid;
}

/**
 * Get power stats for a grid configuration
 * @param {string} reactorId - Reactor ID
 * @param {string} reactorTier - Reactor tier
 * @param {string} aux1Id - First aux generator ID
 * @param {string} aux1Tier - Aux 1 tier
 * @param {string} aux2Id - Second aux generator ID
 * @param {string} aux2Tier - Aux 2 tier
 * @returns {{total: number, protected: number, unprotected: number}}
 */
export function getGridStats(reactorId, reactorTier = '1', aux1Id = 'none', aux1Tier = '1', aux2Id = 'none', aux2Tier = '1') {
    const reactorData = getReactorTier(reactorId, reactorTier);
    const aux1Data = getAuxGeneratorTier(aux1Id, aux1Tier) || getAuxGeneratorTier('none', '1');
    const aux2Data = getAuxGeneratorTier(aux2Id, aux2Tier) || getAuxGeneratorTier('none', '1');
    
    const stats = {
        total: 0,
        protected: 0,
        unprotected: 0
    };
    
    if (reactorData) {
        stats.total += reactorData.powerGeneration;
        stats.protected += reactorData.protectedPower;
        stats.unprotected += reactorData.unprotectedPower;
    }
    
    if (aux1Data) {
        stats.total += aux1Data.powerGeneration;
        stats.protected += aux1Data.protectedPower;
        stats.unprotected += aux1Data.unprotectedPower;
    }
    
    if (aux2Data) {
        stats.total += aux2Data.powerGeneration;
        stats.protected += aux2Data.protectedPower;
        stats.unprotected += aux2Data.unprotectedPower;
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

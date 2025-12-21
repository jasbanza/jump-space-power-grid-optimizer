/**
 * Grid Templates for Jump Space Power Grid
 * 
 * Each template is an 8x8 2D array where:
 * - 1 = powered (green)
 * - 0 = unpowered (black)
 * 
 * Add your own templates from the game here!
 */

export const GRID_TEMPLATES = {
    empty: {
        id: 'empty',
        name: 'Empty Grid',
        grid: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0]
        ]
    },
    // Template from screenshot - starter ship configuration
    screenshot1: {
        id: 'screenshot1',
        name: 'Screenshot Example',
        grid: [
            [1, 1, 1, 1, 1, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 0, 1, 1, 0, 0, 0],
            [1, 1, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0]
        ]
    }
};

/**
 * Get template by ID
 * @param {string} templateId - Template ID
 * @returns {Object|null} - Template object or null
 */
export function getTemplate(templateId) {
    return GRID_TEMPLATES[templateId] || null;
}

/**
 * Get all template IDs and names for display
 * @returns {Array<{id: string, name: string}>}
 */
export function getTemplateList() {
    return Object.values(GRID_TEMPLATES).map(t => ({
        id: t.id,
        name: t.name
    }));
}

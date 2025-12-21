/**
 * Grid Templates for Jump Space Power Grid
 * 
 * Templates are loaded from data/templates.json
 * 
 * Grid values:
 * - 0 = unpowered (black)
 * - 1 = powered (green)
 * - 2 = protected (light blue - prioritized in solver)
 * 
 * Add your own templates to data/templates.json!
 */

// Templates data loaded from JSON
let GRID_TEMPLATES = {};

/**
 * Load templates from JSON file
 * @returns {Promise<Object>} - Templates object
 */
export async function loadTemplates() {
    try {
        const response = await fetch('data/templates.json');
        GRID_TEMPLATES = await response.json();
        return GRID_TEMPLATES;
    } catch (error) {
        console.error('Failed to load templates:', error);
        return {};
    }
}

/**
 * Get all templates
 * @returns {Object} - All templates
 */
export function getTemplates() {
    return GRID_TEMPLATES;
}

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

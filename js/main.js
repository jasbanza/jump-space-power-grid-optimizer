/**
 * Main Entry Point for Jump Space Power Grid Optimizer
 */

import { initGrid } from './grid.js';
import { initUI } from './ui.js';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Jump Space Power Grid Optimizer initializing...');
    
    // Initialize grid state (loads from localStorage if available)
    initGrid();
    
    // Initialize UI
    initUI();
    
    console.log('Initialization complete!');
});

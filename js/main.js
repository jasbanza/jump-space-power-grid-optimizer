/**
 * Main Entry Point for Jump Space Power Grid Optimizer
 */

import { initGrid } from './grid.js';
import { loadComponents } from './components.js';
import { loadTemplates } from './templates.js';
import { initUI } from './ui.js';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Jump Space Power Grid Optimizer initializing...');
    
    // Show loading state
    const container = document.querySelector('.container');
    if (container) {
        container.classList.add('loading');
    }
    
    try {
        // Load JSON data files
        await Promise.all([
            loadComponents(),
            loadTemplates()
        ]);
        
        // Initialize grid state (loads from localStorage if available)
        initGrid();
        
        // Initialize UI
        initUI();
        
        console.log('Initialization complete!');
    } catch (error) {
        console.error('Failed to initialize:', error);
    } finally {
        // Remove loading state
        if (container) {
            container.classList.remove('loading');
        }
    }
});

/**
 * Dialog System - Reusable modal dialogs for confirmations and prompts
 */

let dialogContainer = null;
let activeDialog = null;

/**
 * Initialize the dialog system - creates the container element
 */
export function initDialogs() {
    if (dialogContainer) return;
    
    dialogContainer = document.createElement('div');
    dialogContainer.id = 'dialog-container';
    dialogContainer.className = 'dialog-overlay hidden';
    dialogContainer.innerHTML = `
        <div class="dialog-box">
            <div class="dialog-header">
                <span class="dialog-icon"></span>
                <h3 class="dialog-title"></h3>
            </div>
            <div class="dialog-content"></div>
            <div class="dialog-input-section hidden">
                <input type="text" class="dialog-input" placeholder="">
                <span class="dialog-input-error"></span>
            </div>
            <div class="dialog-buttons"></div>
        </div>
    `;
    document.body.appendChild(dialogContainer);
    
    // Close on overlay click
    dialogContainer.addEventListener('click', (e) => {
        if (e.target === dialogContainer && activeDialog?.dismissible) {
            closeDialog(null);
        }
    });
    
    // Handle keyboard events
    document.addEventListener('keydown', handleDialogKeydown);
}

/**
 * Handle keyboard events for dialogs
 */
function handleDialogKeydown(e) {
    if (!activeDialog) return;
    
    if (e.key === 'Escape' && activeDialog.dismissible) {
        closeDialog(null);
    } else if (e.key === 'Enter' && activeDialog.enterAction) {
        const btn = dialogContainer.querySelector(`[data-action="${activeDialog.enterAction}"]`);
        if (btn && !btn.disabled) {
            btn.click();
        }
    }
}

/**
 * Show a confirmation dialog
 * @param {Object} options Dialog options
 * @param {string} options.title Dialog title
 * @param {string} options.message Dialog message (can include HTML)
 * @param {string} options.icon Icon to show (warning, info, error, success)
 * @param {Array} options.buttons Array of button configs
 * @param {boolean} options.dismissible Can be dismissed by clicking outside
 * @returns {Promise} Resolves with the action string when a button is clicked
 */
export function showDialog(options) {
    return new Promise((resolve) => {
        initDialogs();
        
        const {
            title = 'Confirm',
            message = '',
            icon = 'warning',
            buttons = [
                { text: 'Cancel', action: 'cancel', style: 'secondary' },
                { text: 'OK', action: 'ok', style: 'primary' }
            ],
            dismissible = true,
            enterAction = null
        } = options;
        
        activeDialog = { resolve, dismissible, enterAction };
        
        // Set icon
        const iconMap = {
            warning: '⚠️',
            info: 'ℹ️',
            error: '❌',
            success: '✅',
            question: '❓'
        };
        dialogContainer.querySelector('.dialog-icon').textContent = iconMap[icon] || iconMap.warning;
        
        // Set title and message
        dialogContainer.querySelector('.dialog-title').textContent = title;
        dialogContainer.querySelector('.dialog-content').innerHTML = message;
        
        // Hide input section
        dialogContainer.querySelector('.dialog-input-section').classList.add('hidden');
        
        // Create buttons
        const buttonsContainer = dialogContainer.querySelector('.dialog-buttons');
        buttonsContainer.innerHTML = '';
        
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = `dialog-btn dialog-btn-${btn.style || 'secondary'}`;
            button.textContent = btn.text;
            button.dataset.action = btn.action;
            if (btn.disabled) button.disabled = true;
            
            button.addEventListener('click', () => {
                closeDialog(btn.action);
            });
            
            buttonsContainer.appendChild(button);
        });
        
        // Show dialog
        dialogContainer.classList.remove('hidden');
        
        // Focus first button
        const firstBtn = buttonsContainer.querySelector('button:not([disabled])');
        if (firstBtn) firstBtn.focus();
    });
}

/**
 * Show a prompt dialog with text input
 * @param {Object} options Dialog options
 * @param {string} options.title Dialog title
 * @param {string} options.message Dialog message
 * @param {string} options.placeholder Input placeholder
 * @param {string} options.defaultValue Default input value
 * @param {Function} options.validator Validation function (returns error string or null)
 * @param {Array} options.buttons Button configs
 * @returns {Promise} Resolves with { action, value } when submitted
 */
export function showPromptDialog(options) {
    return new Promise((resolve) => {
        initDialogs();
        
        const {
            title = 'Enter Value',
            message = '',
            placeholder = '',
            defaultValue = '',
            validator = null,
            buttons = [
                { text: 'Cancel', action: 'cancel', style: 'secondary' },
                { text: 'Save', action: 'save', style: 'primary', requiresInput: true }
            ],
            dismissible = true
        } = options;
        
        activeDialog = { resolve, dismissible, enterAction: 'save', isPrompt: true };
        
        // Set icon
        dialogContainer.querySelector('.dialog-icon').textContent = '✏️';
        
        // Set title and message
        dialogContainer.querySelector('.dialog-title').textContent = title;
        dialogContainer.querySelector('.dialog-content').innerHTML = message;
        
        // Show and configure input
        const inputSection = dialogContainer.querySelector('.dialog-input-section');
        const input = dialogContainer.querySelector('.dialog-input');
        const errorSpan = dialogContainer.querySelector('.dialog-input-error');
        
        inputSection.classList.remove('hidden');
        input.value = defaultValue;
        input.placeholder = placeholder;
        errorSpan.textContent = '';
        
        // Create buttons
        const buttonsContainer = dialogContainer.querySelector('.dialog-buttons');
        buttonsContainer.innerHTML = '';
        
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = `dialog-btn dialog-btn-${btn.style || 'secondary'}`;
            button.textContent = btn.text;
            button.dataset.action = btn.action;
            
            // Disable save button initially if it requires input
            if (btn.requiresInput && !defaultValue) {
                button.disabled = true;
            }
            
            button.addEventListener('click', () => {
                if (btn.action === 'save' || btn.action === 'ok') {
                    closeDialog(btn.action, input.value);
                } else {
                    closeDialog(btn.action, null);
                }
            });
            
            buttonsContainer.appendChild(button);
        });
        
        // Input validation
        const saveBtn = buttonsContainer.querySelector('[data-action="save"], [data-action="ok"]');
        
        input.addEventListener('input', () => {
            const value = input.value.trim();
            let error = null;
            
            if (!value) {
                error = 'Name cannot be empty';
            } else if (validator) {
                error = validator(value);
            }
            
            errorSpan.textContent = error || '';
            
            if (saveBtn) {
                saveBtn.disabled = !!error || !value;
            }
        });
        
        // Show dialog
        dialogContainer.classList.remove('hidden');
        
        // Focus input
        input.focus();
        input.select();
    });
}

/**
 * Close the current dialog
 */
function closeDialog(action, value = null) {
    if (!activeDialog) return;
    
    dialogContainer.classList.add('hidden');
    
    const { resolve, isPrompt } = activeDialog;
    activeDialog = null;
    
    if (isPrompt) {
        resolve({ action, value });
    } else {
        resolve(action);
    }
}

/**
 * Show a toast notification
 * @param {string} message Toast message
 * @param {string} type Toast type (success, error, info, warning)
 * @param {number} duration Duration in ms
 */
export function showToast(message, type = 'info', duration = 3000) {
    let toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconMap = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${iconMap[type] || iconMap.info}</span>
        <span class="toast-message">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('toast-show');
    });
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Pre-built dialog helpers

/**
 * Show a confirmation dialog for destructive actions
 */
export async function confirmDestructive(title, message, confirmText = 'Delete') {
    const action = await showDialog({
        title,
        message,
        icon: 'warning',
        buttons: [
            { text: 'Cancel', action: 'cancel', style: 'secondary' },
            { text: confirmText, action: 'confirm', style: 'danger' }
        ],
        enterAction: null // Don't allow enter to confirm destructive actions
    });
    
    return action === 'confirm';
}

/**
 * Show a simple info dialog
 */
export async function showInfo(title, message) {
    await showDialog({
        title,
        message,
        icon: 'info',
        buttons: [
            { text: 'OK', action: 'ok', style: 'primary' }
        ],
        enterAction: 'ok'
    });
}

/**
 * Show an error dialog
 */
export async function showError(title, message) {
    await showDialog({
        title,
        message,
        icon: 'error',
        buttons: [
            { text: 'OK', action: 'ok', style: 'primary' }
        ],
        enterAction: 'ok'
    });
}



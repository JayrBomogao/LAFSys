/**
 * Dashboard Cleanup Script
 * This script ensures that action buttons (edit/delete) are removed from the Dashboard section
 * It runs on page load and whenever DOM changes are detected
 */

// Run initial cleanup
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard cleanup script loaded');
    runCleanup();
    
    // Set up a MutationObserver to detect DOM changes
    setupMutationObserver();
});

function runCleanup() {
    console.log('Running dashboard cleanup');
    
    // Target the dashboard section specifically
    const dashboardSection = document.getElementById('section-dashboard');
    if (!dashboardSection) {
        console.log('Dashboard section not found');
        return;
    }
    
    // Find any action buttons in the dashboard and remove them
    const actionButtons = dashboardSection.querySelectorAll('.action-buttons, .btn-icon.edit, .btn-icon.delete');
    if (actionButtons.length > 0) {
        console.log(`Found and removing ${actionButtons.length} action buttons from dashboard`);
        actionButtons.forEach(button => {
            if (button.parentNode) {
                button.parentNode.removeChild(button);
            }
        });
    }
    
    // Add CSS directly to enforce hiding action buttons in dashboard
    ensureCSS();
}

function setupMutationObserver() {
    // Create a mutation observer to detect changes to the DOM
    const observer = new MutationObserver(function(mutations) {
        let shouldCleanup = false;
        
        // Check if any mutations affected the dashboard section
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' || mutation.type === 'subtree') {
                shouldCleanup = true;
            }
        });
        
        if (shouldCleanup) {
            console.log('DOM changes detected, running cleanup');
            runCleanup();
        }
    });
    
    // Start observing the document with the configured parameters
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function ensureCSS() {
    // Check if our style already exists
    if (document.getElementById('dashboard-cleanup-css')) {
        return;
    }
    
    // Create and append a style element
    const style = document.createElement('style');
    style.id = 'dashboard-cleanup-css';
    style.textContent = `
        /* Force hide action buttons in Dashboard section */
        #section-dashboard .action-buttons,
        #section-dashboard .btn-icon.edit,
        #section-dashboard .btn-icon.delete {
            display: none !important;
        }
        
        /* Ensure status dropdowns are replaced with badges */
        #section-dashboard .status-dropdown-container select {
            display: none !important;
        }
        
        /* Make dashboard rows non-interactive */
        #section-dashboard .table-row {
            cursor: default !important;
            pointer-events: auto !important;
        }
    `;
    
    document.head.appendChild(style);
}

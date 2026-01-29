/**
 * CLEAN DASHBOARD SCRIPT
 * This script completely removes any action buttons from the Dashboard section
 * It runs at the very end of all other scripts to ensure a clean state
 */

// Wait until all other scripts have loaded and run
window.addEventListener('load', function() {
    console.log('Clean dashboard script running LAST');
    setTimeout(cleanDashboardCompletely, 500); // Run after a delay to ensure all other scripts have completed
});

// Also run on DOMContentLoaded for early cleaning
document.addEventListener('DOMContentLoaded', function() {
    console.log('Clean dashboard init');
    cleanDashboardCompletely();
    
    // Set up to run again when items are updated
    window.addEventListener('itemsUpdated', function() {
        console.log('Items updated - cleaning dashboard again');
        setTimeout(cleanDashboardCompletely, 100);
    });
});

/**
 * Complete dashboard cleaning - removes all interactive elements
 */
function cleanDashboardCompletely() {
    console.log('Running complete dashboard cleanup');
    
    // Target the dashboard section specifically
    const dashboardSection = document.getElementById('section-dashboard');
    if (!dashboardSection) {
        console.log('Dashboard section not found');
        return;
    }
    
    // Get all table rows in the dashboard section
    const recentItemsContainer = dashboardSection.querySelector('#recentItemsContainer');
    if (!recentItemsContainer) {
        console.log('Recent items container not found');
        return;
    }
    
    // First forcefully remove any action buttons
    const actionButtons = recentItemsContainer.querySelectorAll('.action-buttons, .btn-icon, button');
    if (actionButtons.length > 0) {
        console.log(`Removing ${actionButtons.length} action buttons from dashboard`);
        actionButtons.forEach(button => {
            if (button.parentNode) {
                button.parentNode.removeChild(button);
            }
        });
    }
    
    // Replace any status dropdowns with simple badges
    const statusDropdowns = recentItemsContainer.querySelectorAll('select.status-select, .status-dropdown-container select');
    statusDropdowns.forEach(dropdown => {
        // Create a badge to replace the dropdown
        const status = dropdown.value || dropdown.getAttribute('data-current-status') || 'active';
        const badge = document.createElement('span');
        badge.className = `status-badge status-${status === 'soon' ? 'pending' : status === 'claimed' ? 'completed' : 'active'}`;
        badge.textContent = status === 'soon' ? 'For Disposal' : status.charAt(0).toUpperCase() + status.slice(1);
        
        // Replace the dropdown with the badge
        const container = dropdown.parentNode;
        if (container) {
            container.innerHTML = '';
            container.appendChild(badge);
        }
    });
    
    // Make all rows completely non-interactive
    const rows = recentItemsContainer.querySelectorAll('.table-row');
    rows.forEach(row => {
        // Remove all event listeners by cloning
        const newRow = row.cloneNode(true);
        row.parentNode.replaceChild(newRow, row);
        
        // Ensure the row is non-interactive
        newRow.style.cursor = 'default';
        newRow.style.pointerEvents = 'auto';
        newRow.onclick = null;
        
        // Add text to indicate items can only be managed in Items section
        let manageCol = newRow.querySelector('.view-in-items-only');
        if (!manageCol) {
            // Create the column if it doesn't exist
            manageCol = newRow.lastElementChild;
            if (manageCol) {
                manageCol.innerHTML = '<span style="color:#6b7280;font-style:italic;font-size:0.8rem">Manage in Items tab</span>';
                manageCol.className = 'view-in-items-only';
                manageCol.style.textAlign = 'center';
            }
        }
    });
    
    // Add CSS to ensure things stay clean
    addCleanupCSS();
}

/**
 * Adds CSS to ensure dashboard stays clean
 */
function addCleanupCSS() {
    // Check if our style already exists
    if (document.getElementById('clean-dashboard-css')) {
        return;
    }
    
    // Create and append a style element
    const style = document.createElement('style');
    style.id = 'clean-dashboard-css';
    style.textContent = `
        /* IMPORTANT: Force hide any buttons or interactive elements in Dashboard */
        #section-dashboard .action-buttons,
        #section-dashboard .btn-icon,
        #section-dashboard button,
        #section-dashboard .status-select {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            height: 0 !important;
            width: 0 !important;
            position: absolute !important;
            overflow: hidden !important;
        }
        
        /* Make dashboard rows non-interactive */
        #section-dashboard .table-row {
            cursor: default !important;
            pointer-events: auto !important;
            user-select: text !important;
        }
        
        /* Style the manage column */
        #section-dashboard .view-in-items-only {
            color: #6b7280 !important;
            font-style: italic !important;
            font-size: 0.8rem !important;
            text-align: center !important;
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Admin Item Actions - Handles item row clicks and edit/delete buttons
 * This script updates the admin.js functionality to separate view and edit actions
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin item actions script loaded');
    
    function setupItemActions() {
        // First, clean up any delete buttons or edit buttons in the dashboard section
        cleanupDashboardSection();
        
        // Now only target the Items section for interactive elements
        const itemsSection = document.getElementById('section-items');
        if (!itemsSection) {
            console.log('Items section not found');
            return;
        }
        
        // Update table rows in ITEMS section to redirect to view details
        itemsSection.querySelectorAll('.table-row').forEach(row => {
            // Remove existing click listeners
            const newRow = row.cloneNode(true);
            row.parentNode.replaceChild(newRow, row);
            
            // Add new click listener for item details
            newRow.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-icon') && !e.target.closest('.status-select')) {
                    const id = newRow.dataset.id;
                    if (id) {
                        console.log('Viewing item details:', id);
                        window.location.href = 'item-details.html?id=' + id;
                    }
                }
            });
            newRow.style.cursor = 'pointer';
        });
        
        // Add edit button click handler only in Items section
        itemsSection.querySelectorAll('.btn-icon.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const row = btn.closest('.table-row');
                const id = row?.dataset?.id;
                
                if (id) {
                    console.log('Editing item:', id);
                    window.location.href = 'add-item.html?edit=true&id=' + id;
                }
            });
        });
        
        // Make sure existing delete buttons work with new setup - only in Items section
        itemsSection.querySelectorAll('.btn-icon.delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const row = btn.closest('.table-row');
                const id = row?.dataset?.id;
                
                if (id && confirm('Are you sure you want to delete this item?')) {
                    row.style.opacity = '0.5';
                    row.style.pointerEvents = 'none';
                    
                    try {
                        // Try to delete from Firebase if available
                        if (window.firebase?.firestore) {
                            await firebase.firestore().collection('items').doc(id).delete();
                            console.log('Item deleted from Firebase:', id);
                        }
                    } catch (error) {
                        console.error('Error deleting item:', error);
                    }
                    
                    setTimeout(() => { row.style.display = 'none'; }, 200);
                }
            });
        });
    }
    
    // Cleanup function to ensure Dashboard Recent Items section doesn't have action buttons
    function cleanupDashboardSection() {
        console.log('Cleaning up dashboard section');
        const dashboardSection = document.getElementById('section-dashboard');
        if (!dashboardSection) {
            console.log('Dashboard section not found');
            return;
        }
        
        // Remove any edit or delete buttons that might appear in Dashboard
        const dashboardActionButtons = dashboardSection.querySelectorAll('.btn-icon.edit, .btn-icon.delete');
        dashboardActionButtons.forEach(button => {
            console.log('Removing action button from dashboard');
            button.parentNode.removeChild(button);
        });
        
        // Make sure dashboard rows are non-interactive
        dashboardSection.querySelectorAll('.table-row').forEach(row => {
            row.style.cursor = 'default';
            row.style.pointerEvents = 'auto'; // Allow status badge to be visible but no interaction
            
            // Clone to remove any click listeners
            const newRow = row.cloneNode(true);
            row.parentNode.replaceChild(newRow, row);
        });
    }
    
    // Run setup initially
    setupItemActions();
    
    // Re-run setup when items are updated
    window.addEventListener('itemsUpdated', () => {
        setTimeout(setupItemActions, 300);
    });
});

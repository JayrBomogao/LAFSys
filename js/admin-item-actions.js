/**
 * Admin Item Actions - Handles item row clicks and edit/delete buttons
 * This script updates the admin.js functionality to separate view and edit actions
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin item actions script loaded');
    
    function setupItemActions() {
        // Update all table rows to redirect to view details instead of edit
        document.querySelectorAll('.table-row').forEach(row => {
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
        
        // Add edit button click handler
        document.querySelectorAll('.btn-icon.edit').forEach(btn => {
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
        
        // Make sure existing delete buttons work with new setup
        document.querySelectorAll('.btn-icon.delete').forEach(btn => {
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
    
    // Run setup initially
    setupItemActions();
    
    // Re-run setup when items are updated
    window.addEventListener('itemsUpdated', () => {
        setTimeout(setupItemActions, 300);
    });
});

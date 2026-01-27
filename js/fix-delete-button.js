// Fix for delete buttons in admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('Delete button fix script loaded');

    // Function to wire up delete buttons
    function wireDeleteButtons() {
        console.log('Wiring delete buttons...');
        
        // Find all delete buttons in the document
        const deleteButtons = document.querySelectorAll('.btn-icon.delete');
        console.log(`Found ${deleteButtons.length} delete buttons`);
        
        // Remove existing event listeners (if any) and add new ones
        deleteButtons.forEach(btn => {
            // Remove old listeners by cloning
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            // Add new event listener
            newBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Delete button clicked');
                const row = this.closest('.table-row');
                const id = row?.dataset?.id;
                
                if (!id) {
                    console.error('Missing item ID on delete button');
                    return;
                }
                
                if (confirm('Are you sure you want to delete this item?')) {
                    console.log('Deleting item with ID:', id);
                    row.style.opacity = '0.5';
                    row.style.pointerEvents = 'none';
                    
                    try {
                        // Delete from Firebase
                        if (window.firebase?.firestore) {
                            await firebase.firestore().collection('items').doc(id).delete();
                            console.log('Item deleted successfully:', id);
                            
                            // Create a success message
                            const successMsg = document.createElement('div');
                            successMsg.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:12px 20px;border-radius:8px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1);';
                            successMsg.textContent = 'Item deleted successfully';
                            document.body.appendChild(successMsg);
                            setTimeout(() => successMsg.remove(), 3000);
                            
                            // Hide the row
                            setTimeout(() => { row.style.display = 'none'; }, 200);
                            
                            // Trigger refresh of items
                            const event = new CustomEvent('itemsUpdated');
                            window.dispatchEvent(event);
                        } else {
                            throw new Error('Firebase not available');
                        }
                    } catch (error) {
                        console.error('Failed to delete item:', error);
                        alert('Error deleting item: ' + error.message);
                        
                        // Reset the row styling
                        row.style.opacity = '';
                        row.style.pointerEvents = '';
                    }
                }
            });
        });
    }
    
    // Run initial wiring
    wireDeleteButtons();
    
    // Re-wire buttons when items are updated
    window.addEventListener('itemsUpdated', () => {
        setTimeout(wireDeleteButtons, 500); // Wait for DOM to update
    });
});

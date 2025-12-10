// Debug script to fix dashboard item clicks
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard debug script loaded');
    
    // Wait a bit to make sure items have loaded
    setTimeout(() => {
        // Check for item cards and ensure they're clickable
        const itemCards = document.querySelectorAll('.item-card');
        console.log(`Found ${itemCards.length} item cards`);
        
        if (itemCards.length > 0) {
            // Add a visual indicator when hovering over cards
            itemCards.forEach(card => {
                // Add hover effect
                card.style.transition = 'transform 0.2s, box-shadow 0.2s';
                card.addEventListener('mouseenter', () => {
                    card.style.transform = 'translateY(-5px)';
                    card.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                });
                card.addEventListener('mouseleave', () => {
                    card.style.transform = '';
                    card.style.boxShadow = '';
                });
                
                // Ensure "View Details" buttons are working
                const viewButton = card.querySelector('.view-item');
                if (viewButton) {
                    // Add extra click handler for the button
                    viewButton.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent card click
                        console.log('View details button clicked for item:', card.dataset.id);
                        
                        // Try to force open the item details using getItemById
                        if (window.getItemById) {
                            window.getItemById(card.dataset.id)
                                .then(item => {
                                    if (item) {
                                        console.log('Item details retrieved:', item);
                                        if (window.openItemDetails) {
                                            window.openItemDetails(item);
                                        } else {
                                            console.error('openItemDetails function not found');
                                        }
                                    } else {
                                        console.error('Could not find item with ID:', card.dataset.id);
                                    }
                                })
                                .catch(err => console.error('Error getting item details:', err));
                        }
                    });
                }
            });
            
            console.log('Added enhanced click and hover effects to item cards');
        } else {
            console.warn('No item cards found. The items may not have loaded yet.');
        }
    }, 1000);
});

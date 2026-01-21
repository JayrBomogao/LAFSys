// Search functionality for the main dashboard
console.log('Search.js loaded');

document.addEventListener('DOMContentLoaded', function() {
    // Get references to the search elements
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const refreshButton = document.getElementById('refresh-items');
    
    if (!searchInput || !searchButton) {
        console.error('Search elements not found');
        return;
    }
    
    console.log('Search elements found, initializing search functionality');
    
    // Add event listeners for search
    searchButton.addEventListener('click', function() {
        performSearch();
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch();
        }
    });

    // Ensure refresh button resets the title and clears search state
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            // Clear any search term
            if (searchInput) {
                searchInput.value = '';
            }

            // Reset the section title
            const sectionTitle = document.querySelector('.items-title');
            if (sectionTitle) {
                sectionTitle.textContent = 'Recently Found Items';
            }
        });
    }
    
    // Function to perform the search
    async function performSearch() {
        const searchTerm = searchInput.value.trim();
        console.log('Performing search for:', searchTerm);
        
        if (!searchTerm) {
            console.log('Empty search term, loading all items');
            fetchAndDisplayItems();
            return;
        }
        
        // Show loading state
        const itemsContainer = document.getElementById('items-container');
        if (itemsContainer) {
            itemsContainer.innerHTML = '<div class="loading">Searching items...</div>';
        }
        
        try {
            // Search in Firestore
            console.log('Searching Firestore for:', searchTerm);
            
            // Get all items from the collection
            const querySnapshot = await firebase.firestore().collection('items').get();
            
            // Filter items based on the search term
            const searchResults = [];
            const lowerSearchTerm = searchTerm.toLowerCase();
            
            querySnapshot.forEach(doc => {
                const data = doc.data();
                const title = (data.title || '').toLowerCase();
                const description = (data.description || '').toLowerCase();
                const location = (data.location || '').toLowerCase();
                const category = (data.category || '').toLowerCase();
                const status = (data.status || 'active').toLowerCase();
                if (status === 'claimed' || status === 'returned' || status === 'disposed') {
                    return;
                }
                
                // Check if the search term is in any of the fields
                if (
                    title.includes(lowerSearchTerm) ||
                    description.includes(lowerSearchTerm) ||
                    location.includes(lowerSearchTerm) ||
                    category.includes(lowerSearchTerm)
                ) {
                    searchResults.push({
                        id: doc.id,
                        ...data
                    });
                }
            });
            
            console.log('Search results:', searchResults.length);
            
            // Display search results
            displaySearchResults(searchResults);
            
        } catch (error) {
            console.error('Error searching items:', error);
            if (itemsContainer) {
                itemsContainer.innerHTML = `<div class="error">Error searching items: ${error.message}</div>`;
            }
        }
    }
    
    // Function to display search results
    function displaySearchResults(results) {
        const itemsContainer = document.getElementById('items-container');
        if (!itemsContainer) {
            console.error('Items container not found');
            return;
        }
        
        if (results.length === 0) {
            itemsContainer.innerHTML = '<div class="no-items">No items found matching your search.</div>';
            return;
        }
        
        // Start building HTML for all items
        let allItemsHTML = '';
        
        // Process each item and build HTML string
        results.forEach(data => {
            const id = data.id;
            
            // Format date
            const dateFound = data.date ? new Date(data.date.seconds ? data.date.seconds * 1000 : data.date) : null;
            const formattedDate = dateFound ? dateFound.toLocaleDateString() : 'Unknown date';
            
            // Use the actual image URL from Firebase Storage or fallback to placeholder
            let imageUrl = data.image || 'https://via.placeholder.com/300x200?text=No+Image';
            
            // Determine the item status and the corresponding badge style
            const itemStatus = data.status || 'active';
            let statusBadge = '';
            
            if (itemStatus === 'claimed') {
                statusBadge = `<div class="status-badge status-claimed">Claimed</div>`;
            } else if (itemStatus === 'returned') {
                statusBadge = `<div class="status-badge status-returned">Returned</div>`;
            } else if (itemStatus === 'disposed') {
                statusBadge = `<div class="status-badge status-disposed">Disposed</div>`;
            } else {
                statusBadge = `<div class="status-badge status-active">Active</div>`;
            }
            
            // Build HTML for this item
            allItemsHTML += `
                <div class="item-card" data-item-id="${id}">
                    <div class="item-image">
                        <img src="${imageUrl}" alt="${data.title || 'Unknown item'}" onerror="this.src='https://via.placeholder.com/300x200?text=Image+Error'">
                        ${statusBadge}
                    </div>
                    <div class="item-content">
                        <h3 class="item-title">${data.title || 'Unnamed Item'}</h3>
                        <div class="item-category">${data.category || 'Uncategorized'}</div>
                        <div class="item-details">
                            <div>📍 ${data.location || 'Unknown location'}</div>
                            <div>📅 ${formattedDate}</div>
                        </div>
                        <div class="item-actions">
                            <button class="btn btn-primary view-item" onclick="window.location.href='item-details.html?id=${id}'">
                                👁️ View Details
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        // Update the container with all items at once
        itemsContainer.innerHTML = allItemsHTML;
        
        // Update the section title to show it's search results
        const sectionTitle = document.querySelector('.items-title');
        if (sectionTitle) {
            sectionTitle.textContent = `Search Results (${results.length} items)`;
        }
        
        console.log(`Successfully displayed ${results.length} search results`);
    }
});
